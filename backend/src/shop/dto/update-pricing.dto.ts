import { IsNumber, IsNotEmpty } from 'class-validator';

export class UpdatePricingDto {
  @IsNumber()
  @IsNotEmpty()
  retailPrice: number;

  @IsNumber()
  @IsNotEmpty()
  wholesalePrice: number;

  @IsNumber()
  @IsNotEmpty()
  wholesaleThreshold: number;
}
