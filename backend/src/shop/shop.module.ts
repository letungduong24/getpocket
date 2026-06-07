import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingConfig } from './pricing-config.entity';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { CartItem } from './cart-item.entity';
import { Pack } from './pack.entity';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PricingConfig, Order, OrderItem, CartItem, Pack]),
  ],
  providers: [ShopService, CartService],
  controllers: [ShopController, CartController],
})
export class ShopModule {}
