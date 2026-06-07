import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Pokedex } from './pokedex.entity';

export interface ListPokemonFilters {
  search?: string;
  type?: string;
}

@Injectable()
export class PokedexService {
  constructor(
    @InjectRepository(Pokedex)
    private readonly pokedexRepository: Repository<Pokedex>,
  ) {}

  async getPokemonList(filters: ListPokemonFilters = {}): Promise<Pokedex[]> {
    const { search, type } = filters;

    const qb = this.pokedexRepository
      .createQueryBuilder('p')
      .where('p.is_active = :active', { active: true });

    if (search && search.trim() !== '') {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((qb1) => {
          qb1
            .where('LOWER(p.name) LIKE :term', { term })
            .orWhere('CAST(p.nat_dex AS TEXT) LIKE :dexTerm', {
              dexTerm: term,
            });
        }),
      );
    }

    if (type && type.trim() !== '' && type.toLowerCase() !== 'all') {
      const typeTerm = type.trim();
      qb.andWhere(
        new Brackets((qb1) => {
          qb1
            .where('LOWER(p.type_one) = :type', {
              type: typeTerm.toLowerCase(),
            })
            .orWhere('LOWER(p.type_two) = :type', {
              type: typeTerm.toLowerCase(),
            });
        }),
      );
    }

    qb.orderBy('p.nat_dex', 'ASC').addOrderBy('p.name', 'ASC');

    return qb.getMany();
  }

  async getPokemonById(id: number): Promise<Pokedex | null> {
    return this.pokedexRepository.findOne({ where: { id, isActive: true } });
  }
}
