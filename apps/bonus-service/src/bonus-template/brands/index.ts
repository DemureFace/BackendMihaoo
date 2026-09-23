import { ParsedPromo } from '../dto/parsed-promo.dto';
import { PromoRenderResult } from '../dto/promo-render-result.dto';
import { CompactCardFields } from '../promo-parser.service';
import { buildBhCompactCard, renderBh, renderBhRulesHtml } from './bh.template';
import { buildMwCard, renderMw } from './mw.template';
import { PromoBrand } from './promo-brand.type';
import { CompactCardOptions, PromoSegmentOptions } from './render-options.type';
import { buildSgCompactCard, renderSg, renderSgRulesHtml } from './sg.template';

// Partial: only brands with a supplied template are wired up. Calling
// generate/render for a brand not yet listed here throws a clear
// BadRequestException instead of silently falling back to another brand.
// What a renderer actually populates on PromoRenderResult varies by brand:
// MW returns a full page `template`; BH and SG return a listing `card` +
// a `rulesHtml` snippet (in their own, brand-specific card shapes — see
// BhPromoCard vs SgPromoCard). Callers check which fields are present.
export const BRAND_TEMPLATE_RENDERERS: Partial<
  Record<
    PromoBrand,
    (
      parsed: ParsedPromo,
      imageUrl: string,
      overrides: Map<string, string>,
      options: PromoSegmentOptions,
    ) => PromoRenderResult
  >
> = {
  MW: renderMw,
  BH: renderBh,
  SG: renderSg,
};

// Only the brands whose rules render generically from `parsed.termsPoints`
// (see bh.template.ts / sg.template.ts) can produce rules HTML from a
// terms-only input with no banner/body fields — MW's rules are embedded in
// a full-page `template` built from those other fields, so it's absent here.
export const RULES_ONLY_RENDERERS: Partial<
  Record<
    PromoBrand,
    (parsed: ParsedPromo, overrides: Map<string, string>) => string
  >
> = {
  BH: renderBhRulesHtml,
  SG: renderSgRulesHtml,
};

// Brands with a compact (details-blurb) listing card variant. See
// dto/promo-card.dto.ts's SgCompactCard/BhCompactCard vs the full cards.
// MW reuses BH's builder verbatim for its "details" cardStyle — the target
// shape (description/bonusCode/buttonTitle/link/type) is identical to BH's,
// unrelated to MW's own "lobby" card below.
export const COMPACT_CARD_RENDERERS: Partial<
  Record<
    PromoBrand,
    (
      fields: CompactCardFields,
      options: CompactCardOptions,
    ) => Record<string, unknown>
  >
> = {
  SG: buildSgCompactCard,
  BH: buildBhCompactCard,
  MW: buildBhCompactCard,
};

// Brands whose lightweight ("lobby") card needs no promo text at all — every
// field is caller-supplied (see CompactCardOptions' MW-only fields). Used
// only when cardStyle is 'lobby' (the default) — see
// BonusTemplateService.generateCompactCard. Currently MW only; MW is also
// in COMPACT_CARD_RENDERERS above for its other ("details") cardStyle.
export const DIRECT_CARD_RENDERERS: Partial<
  Record<PromoBrand, (options: CompactCardOptions) => Record<string, unknown>>
> = {
  MW: buildMwCard,
};

// Only MW's page template consumes heading/introText/tiers/gameLinks/
// actionText from the promo body (see mw.template.ts) — BH and SG render
// generically from termsPoints alone, so their briefs don't need a
// "Deposit ..." tier line or a closing "Play X and Y" line to match MW's
// rigid recurring shape. Passed to PromoParserService.parse() so it knows
// how strict to be about the body structure for a given brand.
export const BODY_STRUCTURE_REQUIRED_BRANDS = new Set<PromoBrand>(['MW']);

export { PROMO_BRANDS } from './promo-brand.type';
export type { PromoBrand } from './promo-brand.type';
