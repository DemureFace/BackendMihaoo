import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ORDINARY_TOURNAMENT_BRANDS } from '../brands/tournament-brand.type';
import type { OrdinaryTournamentBrand } from '../brands/tournament-brand.type';

export class GenerateOrdinaryTournamentDto {
  @IsString()
  @MinLength(10)
  text: string;

  @IsIn(ORDINARY_TOURNAMENT_BRANDS)
  brand: OrdinaryTournamentBrand;

  // Not present in the marketing brief text — the CMS-uploaded banner asset
  // URL has to be supplied separately. Original BH-only field name, kept
  // working as an alias for imageUrlDesktop so existing BH requests don't
  // break — one of the two is required (validated in the controller).
  @IsOptional()
  @IsString()
  bgImageSrc?: string;

  @IsOptional()
  @IsString()
  imageUrlDesktop?: string;

  // SG only today: its ordinary card/page carry a separate mobile asset
  // alongside the desktop one, same as its bonus promo cards do.
  @IsOptional()
  @IsString()
  imageUrlMobile?: string;

  // Defaults to `tournament_<startMonth><year>`, derived from the tournament
  // dates found in the text, when omitted.
  @IsOptional()
  @IsString()
  frontendIdentifier?: string;

  // Which player groups are excluded from the card listing — caller-
  // supplied per campaign, not parsed from the brief text. Defaults to []
  // (visible to everyone) when omitted.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disallowedForGroups?: string[];
}
