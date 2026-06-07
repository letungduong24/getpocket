import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './cart-item.entity';

export interface CartConfigPayload {
  speciesId: number;
  speciesName: string;
  speciesSpriteUrl?: string | null;
  shiny: boolean;
  level: number;
  gender: string;
  ability: string;
  nature: string;
  heldItem: string;
  moves: string[];
  ivs: Record<string, number>;
  evs: Record<string, number>;
  trainerName: string;
  trainerTid: number;
  trainerSid: number;
  isPack?: boolean;
  packId?: number;
  price?: number;
  items?: any[];
  description?: string;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepository: Repository<CartItem>,
  ) {}

  async listForUser(userId: number): Promise<CartItem[]> {
    return this.cartRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async addItem(userId: number, config: CartConfigPayload): Promise<CartItem> {
    const item = this.cartRepository.create({
      userId,
      config: config as unknown as Record<string, unknown>,
    });
    return this.cartRepository.save(item);
  }

  async removeItem(userId: number, itemId: number): Promise<void> {
    const result = await this.cartRepository.delete({ id: itemId, userId });
    if (!result.affected) {
      throw new NotFoundException(
        `Cart item #${itemId} không tồn tại trong giỏ hàng.`,
      );
    }
  }

  async clearForUser(userId: number): Promise<void> {
    await this.cartRepository.delete({ userId });
  }
}
