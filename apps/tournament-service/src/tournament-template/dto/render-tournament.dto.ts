import { IsIn, IsObject } from 'class-validator';
import { TOURNAMENT_BRANDS } from '../brands/tournament-brand.type';
import type { TournamentBrand } from '../brands/tournament-brand.type';
import type { ParsedTournament } from './parsed-tournament.dto';

export class RenderTournamentDto {
  @IsObject()
  parsed: ParsedTournament;

  @IsIn(TOURNAMENT_BRANDS)
  brand: TournamentBrand;
}
