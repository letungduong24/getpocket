import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('pokemon_dex')
export class Pokedex {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nat_dex' })
  natDex: number;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'type_one', length: 50 })
  typeOne: string;

  @Column({ name: 'type_two', length: 50, default: 'N/A' })
  typeTwo: string;

  @Column('text', { array: true })
  abilities: string[];

  @Column('text', { array: true })
  moves: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sprite_url', nullable: true, type: 'text' })
  spriteUrl: string | null;
}
