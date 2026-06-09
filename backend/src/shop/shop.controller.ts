import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ShopService } from './shop.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SimpleOrderDto } from './dto/simple-order.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post('pokemon/validate')
  async validatePokemon(@Body() body: any) {
    return this.shopService.validatePokemon(body);
  }

  @Get('pokemon/items')
  async getPopularItems() {
    return this.shopService.getPopularItems();
  }

  @Get('packs')
  async getPacks() {
    return this.shopService.getPacks();
  }

  @UseGuards(AuthGuard)
  @Post('orders')
  async submitOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser('sub') userId: number,
  ) {
    return this.shopService.createOrder(dto, userId);
  }

  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @Post('orders/simple')
  async submitSimpleOrder(@Body() dto: SimpleOrderDto) {
    return this.shopService.createSimpleOrder(dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/orders')
  async getAdminOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.shopService.getAdminOrders({ page, limit, search, status });
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/orders/:id/status')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: 'PENDING' | 'COMPLETED' | 'CANCELLED',
  ) {
    if (!['PENDING', 'COMPLETED', 'CANCELLED'].includes(status)) {
      throw new BadRequestException('Trạng thái không hợp lệ.');
    }
    return this.shopService.updateOrderStatus(id, status);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/orders/:id/download')
  async downloadOrderZip(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    try {
      const { archive, fileName } = await this.shopService.getOrderZip(id);

      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.setHeader('Content-Type', 'application/zip');

      archive.pipe(res);
    } catch (err) {
      console.error('Download ZIP failed:', err);
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: `Không thể tạo tệp tải về: ${err.message}`,
        });
      }
    }
  }

  @Get('notes')
  async getNotes() {
    return this.shopService.getNotes();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/notes')
  async createNote(@Body() body: { content: string; sortOrder?: number }) {
    if (!body.content?.trim()) {
      throw new BadRequestException('Nội dung thông báo không được để trống.');
    }
    return this.shopService.createNote(body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/notes/:id')
  async updateNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title?: string; content?: string; sortOrder?: number; active?: boolean },
  ) {
    return this.shopService.updateNote(id, body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/notes/:id')
  async deleteNote(@Param('id', ParseIntPipe) id: number) {
    return this.shopService.deleteNote(id);
  }

  @Get('admin/pricing')
  async getPricing() {
    return this.shopService.getPricing();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/pricing')
  async updatePricing(@Body() dto: UpdatePricingDto) {
    return this.shopService.updatePricing(dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/packs/:id')
  async updatePack(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { price: number; description: string },
  ) {
    return this.shopService.updatePack(id, body.price, body.description);
  }
}
