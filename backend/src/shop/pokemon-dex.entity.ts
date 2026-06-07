import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('pokemon_dex')
export class PokemonDex {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nat_dex' })
  natDex: number;

  @Column()
  name: string;

  @Column({ name: 'type_one' })
  typeOne: string;

  @Column({ name: 'type_two', default: 'N/A' })
  typeTwo: string;

  @Column('text', { array: true })
  abilities: string[];

  @Column('text', { array: true })
  moves: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
