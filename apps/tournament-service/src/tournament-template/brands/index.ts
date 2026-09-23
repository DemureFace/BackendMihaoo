import { OrdinaryTournamentCard } from '../dto/ordinary-tournament-card.dto';
import { ParsedOrdinaryTournament } from '../dto/parsed-ordinary-tournament.dto';
import { ParsedTournament } from '../dto/parsed-tournament.dto';
import { renderBohoOrdinary } from './boho-ordinary.template';
import { renderBoho } from './boho.template';
import { renderMw, renderMwLocales } from './mw.template';
import { renderSgOrdinary, renderSgOrdinaryCard } from './sg-ordinary.template';
import { renderSg } from './sg.template';
import {
  OrdinaryTournamentBrand,
  TournamentBrand,
} from './tournament-brand.type';

export const BRAND_TEMPLATE_RENDERERS: Record<
  TournamentBrand,
  (parsed: ParsedTournament) => string
> = {
  BH: renderBoho,
  SG: renderSg,
  MW: renderMw,
};

export const ORDINARY_BRAND_TEMPLATE_RENDERERS: Record<
  OrdinaryTournamentBrand,
  (parsed: ParsedOrdinaryTournament) => string
> = {
  BH: renderBohoOrdinary,
  SG: renderSgOrdinary,
};

// Not every ordinary brand has a listing-card shape yet (only brands whose
// landing page lists tournaments this way need one) — Partial, keyed off
// brand availability rather than assuming every brand has one.
export const ORDINARY_CARD_BUILDERS: Partial<
  Record<
    OrdinaryTournamentBrand,
    (parsed: ParsedOrdinaryTournament) => OrdinaryTournamentCard
  >
> = {
  SG: renderSgOrdinaryCard,
};

// Brands whose template varies per-locale (e.g. MW's ipPool.default mirrors
// whichever locale-build of the page is being served). Not every brand needs
// this, hence Partial.
export const LOCALE_TEMPLATE_RENDERERS: Partial<
  Record<TournamentBrand, (parsed: ParsedTournament) => Record<string, string>>
> = {
  MW: renderMwLocales,
};

export {
  ORDINARY_TOURNAMENT_BRANDS,
  TOURNAMENT_BRANDS,
} from './tournament-brand.type';
export type {
  OrdinaryTournamentBrand,
  TournamentBrand,
} from './tournament-brand.type';
