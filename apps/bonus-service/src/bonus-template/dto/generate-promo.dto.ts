import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PROMO_BRANDS } from '../brands/promo-brand.type';
import type { PromoBrand } from '../brands/promo-brand.type';

export class DateRangeInputDto {
  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;
}

export class TermsLinkInputDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsBoolean()
  isModal?: boolean;
}

export class GeneratePromoDto {
  @IsString()
  @MinLength(10)
  text: string;

  @IsIn(PROMO_BRANDS)
  brand: PromoBrand;

  @IsString()
  @MinLength(1)
  imageUrl: string;

  // Keyed by the money mention as it appears in `text` (e.g. "€1"). Lets a
  // caller point a specific amount at a pre-existing multi-currency CMS
  // snippet (e.g. "1eur-12aud-2nzd") that the default amount+currency naming
  // formula can't derive on its own.
  @IsOptional()
  @IsObject()
  moneySnippetOverrides?: Record<string, string>;

  // The rest only matter for card-based brands (BH, SG). MW ignores them.

  @IsOptional()
  @IsIn(['regular', 'vip'])
  segment?: 'regular' | 'vip';

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeInputDto)
  publishDateRange?: DateRangeInputDto;

  @IsOptional()
  @IsString()
  imageUrlDesktop?: string;

  // SG only: the "bgMob" asset — SG publishes a separate mobile background
  // image alongside the desktop one passed via `imageUrl`.
  @IsOptional()
  @IsString()
  imageUrlMobile?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // SG only.
  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  cardType?: string;

  @IsOptional()
  @IsString()
  buttonTitle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TermsLinkInputDto)
  termsLink?: TermsLinkInputDto;

  // Overrides the brand's default 'all_vip'/'all_except_vip' group-based
  // visibility — pass this when the campaign targets its own group codes
  // (e.g. "allowed_for_regulars" / "allowed_for_previp").
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedForGroups?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disallowedForGroups?: string[];
}
