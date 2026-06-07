import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('packs')
export class Pack {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column('decimal', { precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('jsonb')
  items: any[];
}
