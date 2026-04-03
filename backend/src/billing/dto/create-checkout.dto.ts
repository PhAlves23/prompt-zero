import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum CheckoutTierDto {
  pro = 'pro',
  team = 'team',
}

export class CreateCheckoutDto {
  @ApiProperty({ enum: CheckoutTierDto })
  @IsEnum(CheckoutTierDto)
  tier!: CheckoutTierDto;
}
