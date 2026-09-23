import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PROMO_BRANDS } from '../brands/promo-brand.type';
import type { PromoBrand } from '../brands/promo-brand.type';
import { DateRangeInputDto, TermsLinkInputDto } from './generate-promo.dto';
import type { ParsedPromo } from './parsed-promo.dto';

export class RenderPromoDto {
  @IsObject()
  parsed: ParsedPromo;

  @IsIn(PROMO_BRANDS)
  brand: PromoBrand;

  @IsString()
  @MinLength(1)
  imageUrl: string;

  @IsOptional()
  @IsObject()
  moneySnippetOverrides?: Record<string, string>;

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

  @IsOptional()
  @IsString()
  imageUrlMobile?: string;

  @IsOptional()
  @IsString()
  description?: string;

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedForGroups?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disallowedForGroups?: string[];
}
