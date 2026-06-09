import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingConfig } from './pricing-config.entity';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Pack } from './pack.entity';
import { Note } from './note.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { SimpleOrderDto } from './dto/simple-order.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import * as fs from 'fs';
import * as path from 'path';
import * as archiverModule from 'archiver';

@Injectable()
export class ShopService {
  private readonly microserviceUrl =
    process.env.MICROSERVICE_URL || 'http://localhost:5001';

  constructor(
    @InjectRepository(PricingConfig)
    private readonly pricingRepository: Repository<PricingConfig>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Pack)
    private readonly packRepository: Repository<Pack>,
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {}

  async getPacks(): Promise<Pack[]> {
    return this.packRepository.find();
  }

  async validatePokemon(pokemon: any) {
    const url = `${this.microserviceUrl}/api/validate`;
    const normalized = {
      ...pokemon,
      species: pokemon.species || pokemon.speciesName,
      isShiny: typeof pokemon.isShiny === 'boolean' ? pokemon.isShiny : (typeof pokemon.shiny === 'boolean' ? pokemon.shiny : false),
      trainerTID: pokemon.trainerTid || pokemon.trainerTID,
      trainerSID: pokemon.trainerSid || pokemon.trainerSID,
    };
    const first = await this.callValidate(url, normalized, false);

    // Auto-retry: if the first attempt failed with the PKHeX "Unable to match
    // an encounter from origin game" error, retry with forceEvent=true. The C#
    // microservice is expected to fall back to the encounter-event database,
    // which is more permissive for trade-only / event-only Pokémon.
    if (
      !first.valid &&
      typeof first.report === 'string' &&
      first.report.toLowerCase().includes('unable to match an encounter')
    ) {
      const retry = await this.callValidate(url, normalized, true);
      if (retry.valid) {
        return { ...retry, report: `${retry.report}\n\n(Đã fallback về dạng Event.)` };
      }
      return retry;
    }

    return first;
  }

  private async callValidate(url: string, pokemon: any, forceEvent: boolean) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pokemon, forceEvent }),
      });

      if (!response.ok) {
        const errData = await response.json();
        return {
          valid: false,
          report: errData.report || 'Validation failed at microservice.',
        };
      }

      return await response.json();
    } catch (err) {
      console.error('Validate service call failed:', err);
      return {
        valid: false,
        report: `Không thể kết nối với dịch vụ kiểm tra hợp lệ: ${err.message}`,
      };
    }
  }

  private async generateOrderItem(pkInfo: any, sectionName: string): Promise<OrderItem> {
    const generateUrl = `${this.microserviceUrl}/api/generate`;
    let res;
    const normalized = {
      species: pkInfo.speciesName || pkInfo.species,
      level: pkInfo.level,
      isShiny: typeof pkInfo.isShiny === 'boolean' ? pkInfo.isShiny : (typeof pkInfo.shiny === 'boolean' ? pkInfo.shiny : false),
      gender: pkInfo.gender || 'M',
      ability: pkInfo.ability,
      nature: pkInfo.nature,
      heldItem: pkInfo.heldItem || 'None',
      moves: pkInfo.moves,
      ivs: pkInfo.ivs,
      evs: pkInfo.evs,
      trainerName: pkInfo.trainerName,
      trainerTID: pkInfo.trainerTid || pkInfo.trainerTID,
      trainerSID: pkInfo.trainerSid || pkInfo.trainerSID,
      isEvent: pkInfo.isEvent || false,
      bypassLegality: pkInfo.bypassLegality || false,
    };
    try {
      const response = await fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new BadRequestException(
          `Pokémon ${pkInfo.speciesName || pkInfo.species} không hợp lệ: ${errData.report || 'Lỗi sinh file.'}`,
        );
      }
      res = await response.json();
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        `Không thể sinh Pokémon ${pkInfo.speciesName || pkInfo.species}. C# Microservice offline: ${err.message}`,
      );
    }

    if (!res.valid) {
      throw new BadRequestException(
        `Pokémon ${pkInfo.speciesName} không hợp lệ: ${res.report}`,
      );
    }

    const pk7Buffer = Buffer.from(res.pk7Base64, 'base64');

    const item = new OrderItem();
    item.speciesId = pkInfo.speciesId;
    item.speciesName = pkInfo.speciesName;
    item.shiny = pkInfo.shiny || false;
    item.level = pkInfo.level;
    item.ability = pkInfo.ability;
    item.nature = pkInfo.nature;
    item.heldItem = pkInfo.heldItem || 'None';
    item.moves = pkInfo.moves;
    item.ivs = pkInfo.ivs;
    item.evs = pkInfo.evs;
    item.trainerName = pkInfo.trainerName;
    item.trainerTid = pkInfo.trainerTid;
    item.trainerSid = pkInfo.trainerSid;
    item.pk7Data = pk7Buffer;
    item.sectionName = sectionName;

    return item;
  }

  async createSimpleOrder(dto: SimpleOrderDto, userId?: number) {
    const order = new Order();
    order.customerName = dto.customerName;
    order.contactInfo = dto.contactInfo;
    order.totalPrice = 0;
    order.status = 'PENDING';
    order.items = [];
    if (userId) {
      order.userId = userId;
    }

    const savedOrder = await this.orderRepository.save(order);

    return {
      success: true,
      orderId: savedOrder.id,
      totalPrice: 0,
      message:
        'Đơn hàng đã được tạo thành công. Vui lòng liên hệ Admin để biết thêm chi tiết.',
    };
  }

  async createOrder(dto: CreateOrderDto, userId?: number) {
    if (!dto.sections || dto.sections.length === 0) {
      throw new BadRequestException('Đơn hàng phải chứa ít nhất 1 mục.');
    }

    const pricingList = await this.pricingRepository.find();
    const configs: Record<string, number> = {};
    pricingList.forEach((c) => {
      configs[c.key] = Number(c.value);
    });

    const retailPrice = configs['retail_price'] || 15000;
    const wholesalePrice = configs['wholesale_price'] || 10000;
    const wholesaleThreshold = configs['wholesale_threshold'] || 5;

    let totalPrice = 0;
    const orderItems: OrderItem[] = [];

    for (const section of dto.sections) {
      const sectionName = section.sectionName;
      const isPack = section.isPack;

      if (isPack) {
        const pack = await this.packRepository.findOne({ where: { name: sectionName } });
        if (!pack) {
          throw new BadRequestException(`Gói ${sectionName} không tồn tại.`);
        }
        totalPrice += Number(pack.price);

        const overrideShiny = typeof section.shiny === 'boolean' ? section.shiny : false;
        for (const pkInfo of pack.items) {
          const overriddenPkInfo = { ...pkInfo, shiny: overrideShiny, bypassLegality: true };
          const item = await this.generateOrderItem(overriddenPkInfo, sectionName);
          orderItems.push(item);
        }
      } else {
        const count = section.pokemons.length;
        const isWholesale = count >= wholesaleThreshold;
        const unitPrice = isWholesale ? wholesalePrice : retailPrice;
        totalPrice += count * unitPrice;

        for (const pkInfo of section.pokemons) {
          const item = await this.generateOrderItem(pkInfo, sectionName || 'Custom Pokémon');
          orderItems.push(item);
        }
      }
    }

    const order = new Order();
    order.customerName = dto.customerName;
    order.contactInfo = dto.contactInfo;
    order.totalPrice = totalPrice;
    order.status = 'PENDING';
    order.items = orderItems;
    if (userId) {
      order.userId = userId;
    }

    const savedOrder = await this.orderRepository.save(order);

    return {
      success: true,
      orderId: savedOrder.id,
      totalPrice: savedOrder.totalPrice,
      message:
        'Đơn hàng đã được tạo thành công. Vui lòng liên hệ Admin để chuyển giao Pokémon.',
    };
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: { items: true },
    });
  }

  async getAdminOrders(): Promise<Order[]> {
    return this.orderRepository.find({
      order: { createdAt: 'DESC' },
      relations: { items: true },
    });
  }

  async updateOrderStatus(
    id: number,
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED',
  ) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Đơn hàng #${id} không tồn tại.`);
    }
    order.status = status;
    return this.orderRepository.save(order);
  }

  async getOrderZip(
    orderId: number,
  ): Promise<{ archive: archiverModule.Archiver; fileName: string }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Đơn hàng #${orderId} không tồn tại.`);
    }

    if (!order.items || order.items.length === 0) {
      throw new BadRequestException(
        `Đơn hàng #${orderId} không chứa Pokémon nào.`,
      );
    }

    // 1. Tìm file save main mẫu
    let saveFilePath = '';
    const pathsToTry = [
      path.join(process.cwd(), '..', 'main'),
      path.join(process.cwd(), 'main'),
      path.join(__dirname, '..', '..', 'main'),
      'C:\\Study\\trade\\main'
    ];
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        saveFilePath = p;
        break;
      }
    }
    if (!saveFilePath) {
      throw new NotFoundException('Không tìm thấy file save mẫu (main).');
    }

    const saveBuffer = fs.readFileSync(saveFilePath);
    const pk7sBase64 = order.items.map((item) => item.pk7Data.toString('base64'));

    // 2. Gọi C# worker để chèn Pokémon
    const response = await fetch(`${this.microserviceUrl}/api/inject-save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SaveDataBase64: saveBuffer.toString('base64'),
        Pk7sBase64: pk7sBase64,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new BadRequestException(`Lỗi từ worker: ${err}`);
    }

    const result = (await response.json()) as any;
    if (!result.success) {
      throw new BadRequestException(result.error || 'Worker nạp Pokémon thất bại.');
    }

    const modifiedSaveBuffer = Buffer.from(result.modifiedSaveBase64, 'base64');

    // 3. Đóng gói vào ZIP
    const archive = new archiverModule.ZipArchive({ zlib: { level: 9 } });
    const fileName = `order_${orderId}_${order.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;

    archive.on('error', (err) => {
      throw err;
    });

    // Chỉ nén đúng 1 file main kết quả vào ZIP
    archive.append(modifiedSaveBuffer, { name: 'main' });

    archive.finalize();

    return { archive, fileName };
  }

  async getPricing() {
    const list = await this.pricingRepository.find();
    const config: Record<string, number> = {};
    list.forEach((c) => {
      config[c.key] = Number(c.value);
    });
    return {
      retailPrice: config['retail_price'] || 15000,
      wholesalePrice: config['wholesale_price'] || 10000,
      wholesaleThreshold: config['wholesale_threshold'] || 5,
    };
  }

  async updatePricing(dto: UpdatePricingDto) {
    await this.saveConfig('retail_price', dto.retailPrice);
    await this.saveConfig('wholesale_price', dto.wholesalePrice);
    await this.saveConfig('wholesale_threshold', dto.wholesaleThreshold);

    return {
      success: true,
      message: 'Cấu hình giá đã được cập nhật thành công.',
    };
  }

  private async saveConfig(key: string, value: number) {
    let conf = await this.pricingRepository.findOne({ where: { key } });
    if (!conf) {
      conf = new PricingConfig();
      conf.key = key;
    }
    conf.value = value;
    await this.pricingRepository.save(conf);
  }

  async updatePack(id: number, price: number, description: string): Promise<Pack> {
    const pack = await this.packRepository.findOne({ where: { id } });
    if (!pack) {
      throw new NotFoundException(`Gói #${id} không tồn tại.`);
    }
    pack.price = price;
    pack.description = description;
    return this.packRepository.save(pack);
  }

  async getNotes(): Promise<Note[]> {
    return this.noteRepository.find({ where: { active: true }, order: { sortOrder: 'ASC' } });
  }

  async createNote(data: { content: string; sortOrder?: number }): Promise<Note> {
    const maxSort = await this.noteRepository
      .createQueryBuilder('note')
      .select('COALESCE(MAX(note.sortOrder), 0)', 'max')
      .getRawOne();
    const note = new Note();
    note.title = '';
    note.content = data.content;
    note.sortOrder = data.sortOrder ?? (Number(maxSort?.max) + 1);
    note.active = true;
    return this.noteRepository.save(note);
  }

  async deleteNote(id: number): Promise<void> {
    const note = await this.noteRepository.findOne({ where: { id } });
    if (!note) {
      throw new NotFoundException(`Note #${id} không tồn tại.`);
    }
    await this.noteRepository.remove(note);
  }

  async updateNote(id: number, data: { title?: string; content?: string; sortOrder?: number; active?: boolean }): Promise<Note> {
    const note = await this.noteRepository.findOne({ where: { id } });
    if (!note) {
      throw new NotFoundException(`Note #${id} không tồn tại.`);
    }
    if (data.title !== undefined) note.title = data.title;
    if (data.content !== undefined) note.content = data.content;
    if (data.sortOrder !== undefined) note.sortOrder = data.sortOrder;
    if (data.active !== undefined) note.active = data.active;
    return this.noteRepository.save(note);
  }

  async getPopularItems(): Promise<string[]> {
    try {
      const response = await fetch(`${this.microserviceUrl}/api/items`);
      if (!response.ok) {
        throw new Error('Không thể lấy danh sách vật phẩm từ worker.');
      }
      return response.json() as Promise<string[]>;
    } catch (err) {
      console.error('[ShopService] Lỗi khi lấy danh sách vật phẩm:', err);
      return [
        'None', 'Leftovers', 'Life Orb', 'Choice Band', 'Choice Specs', 'Choice Scarf',
        'Focus Sash', 'Assault Vest', 'Eviolite', 'Rocky Helmet', 'Black Sludge'
      ];
    }
  }
}
