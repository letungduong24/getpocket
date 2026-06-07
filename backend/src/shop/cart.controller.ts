import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CartService } from './cart.service';
import type { CartConfigPayload } from './cart.service';

@Controller('api/cart')
@UseGuards(AuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async list(@CurrentUser('sub') userId: number) {
    return this.cartService.listForUser(userId);
  }

  @Post('items')
  async add(
    @CurrentUser('sub') userId: number,
    @Body() body: CartConfigPayload,
  ) {
    return this.cartService.addItem(userId, body);
  }

  @Delete('items/:id')
  async remove(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.cartService.removeItem(userId, id);
    return { success: true };
  }

  @Delete()
  async clear(@CurrentUser('sub') userId: number) {
    await this.cartService.clearForUser(userId);
    return { success: true };
  }
}
