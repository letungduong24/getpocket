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

  async getPokemonList(filters: ListPokemonFilters = {}): Promise<any[]> {
    const { search, type } = filters;

    // 1. Fetch the specific pack by name
    const packRows = await this.pokedexRepository.manager.query(
      'SELECT * FROM packs WHERE name = $1 LIMIT 1',
      ['Pack Pokémon Champions']
    );
    
    if (packRows.length === 0) {
      return [];
    }

    const pack = packRows[0];
    const items = Array.isArray(pack.items) ? pack.items : [];

    if (items.length === 0) {
      return [];
    }

    // 2. Load all pokemon_dex to get typeOne and typeTwo
    const dexList = await this.pokedexRepository.find({ where: { isActive: true } });
    const dexMap = new Map<number, Pokedex>();
    for (const p of dexList) {
      dexMap.set(p.natDex, p);
    }

    // 3. Enrich items with typeOne and typeTwo
    let enrichedItems = items.map((item, idx) => {
      const dex = dexMap.get(item.speciesId);
      return {
        id: idx + 1, // Generate a unique id for frontend mapping
        natDex: item.speciesId,
        name: item.speciesName,
        typeOne: dex?.typeOne || 'Normal',
        typeTwo: dex?.typeTwo || 'N/A',
        abilities: dex?.abilities || [item.ability],
        moves: item.moves || [],
        spriteUrl: item.speciesSpriteUrl || dex?.spriteUrl || null,
        level: item.level,
        shiny: item.shiny,
        ability: item.ability,
        nature: item.nature,
        heldItem: item.heldItem,
        ivs: item.ivs,
        evs: item.evs,
        trainerName: item.trainerName,
        trainerTid: item.trainerTid,
        trainerSid: item.trainerSid,
        isEvent: item.isEvent,
        packId: pack.id,
        packName: pack.name,
        packPrice: pack.price,
      };
    });

    // 4. Apply filters
    if (search && search.trim() !== '') {
      const s = search.trim().toLowerCase();
      enrichedItems = enrichedItems.filter(
        (item) =>
          item.name.toLowerCase().includes(s) ||
          item.natDex.toString().includes(s)
      );
    }

    if (type && type.trim() !== '' && type.toLowerCase() !== 'all') {
      const t = type.trim().toLowerCase();
      enrichedItems = enrichedItems.filter(
        (item) =>
          item.typeOne.toLowerCase() === t ||
          item.typeTwo.toLowerCase() === t
      );
    }

    // 5. Sort by natDex, then name
    enrichedItems.sort((a, b) => {
      if (a.natDex !== b.natDex) {
        return a.natDex - b.natDex;
      }
      return a.name.localeCompare(b.name);
    });

    return enrichedItems;
  }

  async getPokemonById(id: number): Promise<Pokedex | null> {
    return this.pokedexRepository.findOne({ where: { id, isActive: true } });
  }
}
