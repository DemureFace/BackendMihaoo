import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PROMO_BRANDS } from '../brands/promo-brand.type';
import type { PromoBrand } from '../brands/promo-brand.type';

export class GenerateTermsRulesDto {
  @IsString()
  @MinLength(10)
  text: string;

  @IsIn(PROMO_BRANDS)
  brand: PromoBrand;

  // Falls back to a quoted promo name in the T&C's opening sentence
  // (`The "Name" promotion ...`) when omitted.
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  moneySnippetOverrides?: Record<string, string>;

  // Not used for rendering — accepted so a request copied from
  // /generate/rules/text (which does need it, for the card image) doesn't
  // need `imageUrl` stripped out first.
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
