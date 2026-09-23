import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { TOURNAMENT_BRANDS } from '../brands/tournament-brand.type';
import type { TournamentBrand } from '../brands/tournament-brand.type';

export class GenerateTournamentDto {
  @IsString()
  @MinLength(10)
  text: string;

  @IsIn(TOURNAMENT_BRANDS)
  brand: TournamentBrand;

  @IsString()
  @IsNotEmpty()
  imageUrlDesktop: string;

  // Defaults to imageUrlDesktop when omitted.
  @IsOptional()
  @IsString()
  imageUrlMobile?: string;
}
