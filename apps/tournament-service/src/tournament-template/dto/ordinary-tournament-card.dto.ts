// The tournament-listing card shape (the `tournaments[]` entry a landing
// page reads), as distinct from the standalone tournament page template —
// mirrors bonus-template's card/template split. Not every ordinary brand
// has one yet (only brands whose landing page lists tournaments this way
// need it), so callers key off `ORDINARY_CARD_BUILDERS` being defined for
// the brand rather than assuming this always exists.
export interface OrdinaryTournamentCard {
  [key: string]: unknown;
  frontendIdentifier: string;
  link: string;
  params: {
    name: string;
    pool: { default: string };
    bgImageSrc: string;
    bgImageSrcMob?: string;
  };
  disallowedForGroups: string[];
}
