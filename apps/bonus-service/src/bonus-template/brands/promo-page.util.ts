import { ParsedPromo } from '../dto/parsed-promo.dto';

/**
 * BH/SG's own promo-page shell — mirrors the banner block MW's page opens
 * with (same "promotion-page" component/props), but MW's heading/intro/
 * tiers/closing-CTA section is skipped since BH/SG briefs aren't required
 * to have that structure (see BODY_STRUCTURE_REQUIRED_BRANDS). `rulesHtml`
 * is inserted verbatim — it's the same `<section>...</section>` the card+
 * rules-only endpoints already produce, not rebuilt here.
 */
export function buildPromoPageTemplate(
  parsed: ParsedPromo,
  imageUrl: string,
  rulesHtml: string,
): string {
  return `<Components.Block
                  templateName={'cms-page'}
                  mod={'promotion'}
                  typePage={'promotion'}
                  containerMod={'cms'}
                  >
  <Components.Block
            templateName="promotion-page"
            title="${parsed.title}"
            prize="${parsed.prize}"
            imgUrl="${imageUrl}"
           >
<Components.Block templateName="bonus-code-field" code={"${parsed.code}"}>
</Components.Block>

${rulesHtml}
  </Components.Block>
</Components.Block>`;
}
