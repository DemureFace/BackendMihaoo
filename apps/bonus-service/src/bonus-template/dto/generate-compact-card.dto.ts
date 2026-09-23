import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PROMO_BRANDS } from '../brands/promo-brand.type';
import type { PromoBrand } from '../brands/promo-brand.type';

export class GenerateCompactCardDto {
  // Required for BH/SG (parsed for deposit/FS/wager/code); not used for MW,
  // whose compact card is entirely caller-supplied fields below instead.
  @IsOptional()
  @IsString()
  @MinLength(10)
  text?: string;

  @IsIn(PROMO_BRANDS)
  brand: PromoBrand;

  // MW only, where two different card shapes both exist under this brand:
  // 'lobby' (default) is the caller-supplied GAME OF THE MONTH-style tile
  // (title/promotionLink/category/snippetPrizeName); 'details' is the
  // BH-shaped card parsed from `text` (description/bonusCode/buttonTitle/
  // link/type). Ignored by SG/BH, which only ever have one shape.
  @IsOptional()
  @IsIn(['lobby', 'details'])
  cardStyle?: 'lobby' | 'details';

  // Main/desktop image asset (SG's "bg", BH's "imgURL", MW's "imgURL").
  // Optional here only so `bg` can stand in for it below — one of the two
  // is required (validated in the controller), same as before.
  @IsOptional()
  @IsString()
  @MinLength(1)
  imageUrl?: string;

  // SG only: the "bgMob" asset — SG publishes separate desktop and mobile
  // background images; enforced as required there, but this DTO field
  // stays optional since BH's compact card doesn't use it at all.
  @IsOptional()
  @IsString()
  imageUrlMobile?: string;

  // Original SG-only field names, kept working as aliases for imageUrl/
  // imageUrlMobile so existing SG requests don't break.
  @IsOptional()
  @IsString()
  @MinLength(1)
  bg?: string;

  @IsOptional()
  @IsString()
  bgMob?: string;

  // BH only: its compact card's optional "imgURLDesktop" asset.
  @IsOptional()
  @IsString()
  imageUrlDesktop?: string;

  // Used as snippetDetailsName (BH/SG) or snippetPrizeName (MW).
  @IsString()
  @MinLength(1)
  snippetDetailsName: string;

  // Which player groups see this card — campaign-specific (e.g.
  // "allowed_for_regulars"/"allowed_for_previp"), not defaulted from a
  // regular/vip segment the way the full card is.
  @IsArray()
  @IsString({ each: true })
  allowedForGroups: string[];

  @IsArray()
  @IsString({ each: true })
  disallowedForGroups: string[];

  @IsOptional()
  @IsString()
  subtitle?: string;

  // MW only — no promo text to parse these out of.
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  prize?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  promotionLink?: string;

  @IsOptional()
  @IsBoolean()
  showVipBadge?: boolean;

  @IsOptional()
  @IsBoolean()
  signInOnly?: boolean;
}
