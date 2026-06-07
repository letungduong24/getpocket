import { Controller, Get, Query } from '@nestjs/common';
import { PokedexService, ListPokemonFilters } from './pokedex.service';

@Controller('api')
export class PokedexController {
  constructor(private readonly pokedexService: PokedexService) {}

  @Get('pokemon')
  async getPokemonList(
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    const filters: ListPokemonFilters = {};
    if (search !== undefined && search !== null) filters.search = search;
    if (type !== undefined && type !== null) filters.type = type;
    return this.pokedexService.getPokemonList(filters);
  }
}
