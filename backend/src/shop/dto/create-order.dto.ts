import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StatDictDto {
  @IsNumber()
  hp: number;

  @IsNumber()
  atk: number;

  @IsNumber()
  def: number;

  @IsNumber()
  spa: number;

  @IsNumber()
  spd: number;

  @IsNumber()
  spe: number;
}

export class OrderPokemonDto {
  @IsNumber()
  speciesId: number;

  @IsString()
  @IsNotEmpty()
  speciesName: string;

  @IsBoolean()
  shiny: boolean;

  @IsNumber()
  level: number;

  @IsString()
  @IsNotEmpty()
  ability: string;

  @IsString()
  @IsNotEmpty()
  nature: string;

  @IsString()
  @IsOptional()
  heldItem?: string;

  @IsArray()
  @IsString({ each: true })
  moves: string[];

  @ValidateNested()
  @Type(() => StatDictDto)
  ivs: StatDictDto;

  @ValidateNested()
  @Type(() => StatDictDto)
  evs: StatDictDto;

  @IsString()
  @IsNotEmpty()
  trainerName: string;

  @IsNumber()
  trainerTid: number;

  @IsNumber()
  trainerSid: number;

  @IsBoolean()
  @IsOptional()
  isEvent?: boolean;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  contactInfo: string;

  @IsArray()
  sections: any[];
}
