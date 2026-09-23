export interface ParsedOrdinaryTournament {
  name: string;
  frontendIdentifier: string;
  bgImageSrc: string;
  // Optional since BH's existing ordinary card/page only ever used a single
  // (desktop) image — brands adding a separate mobile asset (e.g. SG) pass
  // this in addition, everyone else just leaves it unset.
  bgImageSrcMob?: string;
  poolAmount: number;
  poolUnit: string;
  descriptionParagraphs: string[];
  termsParagraphs: string[];
  // Caller-supplied visibility for the card listing, not parsed from the
  // brief text — same convention as bonus-template's promo cards. Defaults
  // to [] (visible to everyone) when the caller doesn't pass one.
  disallowedForGroups: string[];
}
