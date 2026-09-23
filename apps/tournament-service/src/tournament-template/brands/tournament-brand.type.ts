// BH = Boho, SG = ..., MW = ... . Add the remaining brand code here once its template is provided.
export const TOURNAMENT_BRANDS = ['BH', 'SG', 'MW'] as const;

export type TournamentBrand = (typeof TOURNAMENT_BRANDS)[number];

// Brands with an "ordinary" (single-site, non-network) tournament template.
// Separate from TOURNAMENT_BRANDS since network and ordinary templates are
// rolled out to brands independently.
export const ORDINARY_TOURNAMENT_BRANDS = ['BH', 'SG'] as const;

export type OrdinaryTournamentBrand =
  (typeof ORDINARY_TOURNAMENT_BRANDS)[number];
