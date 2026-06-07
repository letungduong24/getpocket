import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_name', length: 100 })
  customerName: string;

  @Column({ name: 'contact_info', length: 150 })
  contactInfo: string;

  @Column('numeric', { name: 'total_price', precision: 12, scale: 2 })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
    enumName: 'order_status_enum',
    default: 'PENDING',
  })
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
