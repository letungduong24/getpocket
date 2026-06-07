import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pokedex } from './pokedex.entity';
import { PokedexService } from './pokedex.service';
import { PokedexController } from './pokedex.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pokedex])],
  providers: [PokedexService],
  controllers: [PokedexController],
  exports: [PokedexService, TypeOrmModule],
})
export class PokedexModule {}
