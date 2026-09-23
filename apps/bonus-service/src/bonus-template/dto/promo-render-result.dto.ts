// Which fields a brand populates depends on what that brand actually
// produces — a full page (MW) vs a listing card + rules snippet (BH, SG).
// Consumers check for the presence of the field they need. `card` is left
// loosely typed because each brand's CMS card schema is genuinely
// different (see BhPromoCard vs SgPromoCard in promo-card.dto.ts) — there
// is no shared shape to name here.
export interface PromoRenderResult {
  template?: string;
  card?: Record<string, unknown>;
  rulesHtml?: string;
}
