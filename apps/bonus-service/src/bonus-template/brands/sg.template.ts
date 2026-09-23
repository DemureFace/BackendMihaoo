import { BadRequestException } from '@nestjs/common';
import {
  ValidityLabels,
  defaultDateRangeFromValidity,
  runsConditionLabel,
} from '../date-label.util';
import { buildDefaultDescription } from '../description.util';
import { ParsedPromo } from '../dto/parsed-promo.dto';
import { SgCompactCard, SgPromoCard } from '../dto/promo-card.dto';
import { PromoRenderResult } from '../dto/promo-render-result.dto';
import { CompactCardFields } from '../promo-parser.service';
import { slugify } from '../slug.util';
import { tryParseValidityLabels } from '../terms-facts.util';
import {
  preserveTagAdjacentSpaces,
  processPromoText,
  toTitleCase,
} from '../text-substitution.util';
import { buildPromoPageTemplate } from './promo-page.util';
import { CompactCardOptions, PromoSegmentOptions } from './render-options.type';
import { inferSegmentFromGroups } from './segment.util';

const DEFAULT_TERMS_LINK = {
  title: 'Bonus Terms & Conditions',
  url: 'bonus-terms-and-conditions',
  isModal: true,
};

/**
 * Unlike BH, SG's T&C grouping matches MW's generic line-per-point split
 * exactly (deposit tiers get separate points, "Free spins available" and
 * "value of each free spin" stay separate too) — just rendered as bare
 * `<li>` items instead of MW's inline `<b>N.</b>` numbering. So this reuses
 * `parsed.termsPoints` directly rather than building a fixed skeleton.
 */
export function renderSgRulesHtml(
  parsed: ParsedPromo,
  overrides: Map<string, string>,
): string {
  const items = parsed.termsPoints.map((point) => {
    const withBreaks = point.replace(/\n/g, '<br/>\n                ');
    return `            <li>${processPromoText(withBreaks, parsed, overrides)}</li>`;
  });

  return preserveTagAdjacentSpaces(`<section>
<h2>${parsed.title}</h2>

${items.join('\n')}
</section>`);
}

function buildCard(
  parsed: ParsedPromo,
  imageUrl: string,
  validity: ValidityLabels | undefined,
  options: PromoSegmentOptions,
): SgPromoCard {
  const segment =
    options.segment ??
    parsed.segment ??
    inferSegmentFromGroups(
      options.allowedForGroups,
      options.disallowedForGroups,
    );
  if (!segment) {
    throw new BadRequestException(
      'Could not determine the segment (regular/vip) for the SG card — pass ' +
        'options.segment explicitly, start the text with a standalone "Reg"/' +
        '"VIP" line, or pass options.allowedForGroups/disallowedForGroups ' +
        'containing "all_vip"/"all_except_vip"',
    );
  }
  if (!options.imageUrlMobile) {
    throw new BadRequestException(
      'SG card requires options.imageUrlMobile (the "bgMob" asset) in ' +
        'addition to imageUrl (the "bg" / desktop asset) — SG publishes ' +
        'separate desktop and mobile background images',
    );
  }

  const slug = slugify(parsed.title);
  const isVip = segment === 'vip';

  const buttonTitle =
    options.buttonTitle ??
    (parsed.buttonText ? toTitleCase(parsed.buttonText) : 'Get Bonus');

  const dateRange =
    options.publishDateRange ??
    (validity ? defaultDateRangeFromValidity(validity) : undefined);
  // SG's example has no spaces around the dash, unlike BH's "06.08 - 13.08".
  const condition = validity ? runsConditionLabel(validity, '-') : undefined;

  return {
    title: parsed.title,
    pool: parsed.prize,
    subtitle: options.subtitle ?? '',
    description:
      options.description ?? buildDefaultDescription(parsed, !!validity) ?? '',
    bg: imageUrl,
    bgMob: options.imageUrlMobile,
    snippetDetailsName: isVip ? `${slug}-vip` : slug,
    imgURLDesktop: options.imageUrlDesktop ?? '',
    bonusCode: parsed.code,
    ...(isVip ? { signInOnly: true as const } : {}),
    buttonTitle,
    link: { ...DEFAULT_TERMS_LINK, ...options.termsLink },
    allowedForGroups:
      options.allowedForGroups ?? (isVip ? ['all_vip'] : ['all_except_vip']),
    disallowedForGroups:
      options.disallowedForGroups ?? (isVip ? ['all_except_vip'] : ['all_vip']),
    type: options.cardType ?? 'small',
    ...(dateRange ? { dateRange } : {}),
    ...(condition ? { condition } : {}),
  };
}

/**
 * Builds SG's leaner listing card (SgCompactCard) from just the fields
 * `PromoParserService.parseCompactCardFields` extracts — no T&C parsing,
 * no segment inference; visibility groups and both image assets are
 * caller-supplied since this shape has no default to fall back to.
 */
export function buildSgCompactCard(
  fields: CompactCardFields,
  options: CompactCardOptions,
): SgCompactCard {
  if (!options.imageUrlMobile) {
    throw new BadRequestException(
      'SG compact card requires imageUrlMobile (the "bgMob" asset) in ' +
        'addition to imageUrl (the "bg" / desktop asset) — SG publishes ' +
        'separate desktop and mobile background images',
    );
  }
  return {
    title: fields.title,
    pool: fields.pool,
    subtitle: options.subtitle ?? '',
    details: `<div>Min. deposit:</div><div>${fields.depositText} | ${fields.freeSpinsCount} FS </div><div> Wagering: x${fields.wagerMultiplier} </div><div> Bonus Code: ${fields.code} </div>`,
    bonusCode: fields.code,
    snippetDetailsName: options.snippetDetailsName,
    bg: options.imageUrl,
    bgMob: options.imageUrlMobile,
    allowedForGroups: options.allowedForGroups,
    disallowedForGroups: options.disallowedForGroups,
  };
}

export function renderSg(
  parsed: ParsedPromo,
  imageUrl: string,
  overrides: Map<string, string>,
  options: PromoSegmentOptions = {},
): PromoRenderResult {
  // SG's rules render from parsed.termsPoints directly (like BH) and only
  // need the validity dates here — not the full MW-style wager/max-win/
  // spin-value skeleton that parseTermsFacts would otherwise demand. An
  // evergreen brief with no validity sentence at all is valid input too —
  // the card just omits dateRange/condition then, see buildCard.
  const validity = tryParseValidityLabels(parsed.termsRawText);
  const rulesHtml = renderSgRulesHtml(parsed, overrides);
  return {
    card: buildCard(parsed, imageUrl, validity, options),
    rulesHtml,
    template: buildPromoPageTemplate(parsed, imageUrl, rulesHtml),
  };
}
