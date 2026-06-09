import { IsString, IsNotEmpty } from 'class-validator';

export class SimpleOrderDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  contactInfo: string;
}
