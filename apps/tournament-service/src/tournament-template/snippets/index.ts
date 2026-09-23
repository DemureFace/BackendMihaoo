import { TournamentBrand } from '../brands/tournament-brand.type';
import { ParsedTournament } from '../dto/parsed-tournament.dto';
import { buildBhSnippets } from './bh.snippet';
import { buildMwSnippets } from './mw.snippet';
import { buildSgSnippets } from './sg.snippet';

export const SNIPPET_BUILDERS: Partial<
  Record<TournamentBrand, (parsed: ParsedTournament) => Record<string, unknown>>
> = {
  BH: buildBhSnippets,
  SG: buildSgSnippets,
  MW: buildMwSnippets,
};
