// SG = ..., BH = Boho, MW = MoonWin. Add the remaining brand code here once
// its promo-page template is provided (see mw.template.ts for the shape).
export const PROMO_BRANDS = ['SG', 'BH', 'MW'] as const;

export type PromoBrand = (typeof PROMO_BRANDS)[number];
