import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('pricing_config')
export class PricingConfig {
  @PrimaryColumn({ length: 50 })
  key: string;

  @Column('numeric', { precision: 12, scale: 2 })
  value: number;

  @Column({ nullable: true })
  description: string;
}
