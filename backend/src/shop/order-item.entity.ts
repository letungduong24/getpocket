import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'species_id' })
  speciesId: number;

  @Column({ name: 'species_name', length: 100 })
  speciesName: string;

  @Column({ name: 'shiny', default: false })
  shiny: boolean;

  @Column()
  level: number;

  @Column({ length: 100 })
  ability: string;

  @Column({ length: 100 })
  nature: string;

  @Column({ name: 'held_item', length: 100, default: 'None' })
  heldItem: string;

  @Column('text', { array: true })
  moves: string[];

  @Column('jsonb')
  ivs: any;

  @Column('jsonb')
  evs: any;

  @Column({ name: 'trainer_name', length: 50 })
  trainerName: string;

  @Column({ name: 'trainer_tid' })
  trainerTid: number;

  @Column({ name: 'trainer_sid' })
  trainerSid: number;

  @Column('bytea', { name: 'pk7_data' })
  pk7Data: Buffer;

  @Column({ name: 'section_name', type: 'varchar', length: 100, nullable: true })
  sectionName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
