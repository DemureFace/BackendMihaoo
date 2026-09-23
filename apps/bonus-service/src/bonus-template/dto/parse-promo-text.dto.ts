import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { PROMO_BRANDS } from '../brands/promo-brand.type';
import type { PromoBrand } from '../brands/promo-brand.type';

export class ParsePromoTextDto {
  @IsString()
  @MinLength(10)
  text: string;

  // Determines how strictly the promo-page body (deposit tiers, closing
  // "Play X and Y" line) is validated — only MW's page template needs that
  // structure. Omit to preview with the strict (MW-shaped) parsing.
  @IsOptional()
  @IsIn(PROMO_BRANDS)
  brand?: PromoBrand;
}
