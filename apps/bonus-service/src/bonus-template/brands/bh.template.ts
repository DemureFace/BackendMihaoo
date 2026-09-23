import { BadRequestException } from '@nestjs/common';
import {
  ValidityLabels,
  defaultDateRangeFromValidity,
  runsConditionLabel,
} from '../date-label.util';
import { buildDefaultDescription } from '../description.util';
import { ParsedPromo } from '../dto/parsed-promo.dto';
import { BhCompactCard, BhPromoCard } from '../dto/promo-card.dto';
import { PromoRenderResult } from '../dto/promo-render-result.dto';
import { CompactCardFields } from '../promo-parser.service';
import { slugify } from '../slug.util';
import {
  preserveTagAdjacentSpaces,
  processPromoText,
  toTitleCase,
} from '../text-substitution.util';
import { tryParseValidityLabels } from '../terms-facts.util';
import { buildPromoPageTemplate } from './promo-page.util';
import { CompactCardOptions, PromoSegmentOptions } from './render-options.type';
import { inferSegmentFromGroups } from './segment.util';

const DEFAULT_TERMS_LINK = {
  title: 'Bonus Terms & Conditions',
  url: 'bonus-terms-and-conditions',
  isModal: true,
};

/**
 * Numbers `parsed.termsPoints` as-written (money/code/game-name/T&C-link
 * substitutions applied via the shared `processPromoText` pipeline) rather
 * than rebuilding a fixed fact-based skeleton — mirrors SG's approach, so
 * any T&C shape the generic promo parser accepts can render here, not just
 * the one recurring FS-deposit-bonus boilerplate.
 */
export function renderBhRulesHtml(
  parsed: ParsedPromo,
  overrides: Map<string, string>,
): string {
  const points = parsed.termsPoints.map((point, idx) => {
    const withBreaks = point.replace(/\n/g, '<br/>\n    ');
    return `    <b>${idx + 1}.</b> ${processPromoText(withBreaks, parsed, overrides)}<br/>`;
  });

  return preserveTagAdjacentSpaces(`<section>
  <h2>${parsed.title}</h2>

  <p>
${points.join('\n')}
</p>
</section>`);
}

function buildCard(
  parsed: ParsedPromo,
  imageUrl: string,
  validity: ValidityLabels | undefined,
  options: PromoSegmentOptions,
): BhPromoCard {
  const segment =
    options.segment ??
    parsed.segment ??
    inferSegmentFromGroups(
      options.allowedForGroups,
      options.disallowedForGroups,
    );
  if (!segment) {
    throw new BadRequestException(
      'Could not determine the segment (regular/vip) for the BH card — pass ' +
        'options.segment explicitly, start the text with a standalone "Reg"/' +
        '"VIP" line, or pass options.allowedForGroups/disallowedForGroups ' +
        'containing "all_vip"/"all_except_vip"',
    );
  }

  const slug = slugify(parsed.title);
  const isVip = segment === 'vip';
  const groupFilters =
    options.allowedForGroups || options.disallowedForGroups
      ? {
          ...(options.allowedForGroups && {
            allowedForGroups: options.allowedForGroups,
          }),
          ...(options.disallowedForGroups && {
            disallowedForGroups: options.disallowedForGroups,
          }),
        }
      : isVip
        ? {
            allowedForGroups: ['all_vip'],
            disallowedForGroups: ['all_except_vip'],
          }
        : { disallowedForGroups: ['all_vip'] };

  const buttonTitle =
    options.buttonTitle ??
    (parsed.buttonText ? toTitleCase(parsed.buttonText) : 'Get Bonus');

  const dateRange =
    options.publishDateRange ??
    (validity ? defaultDateRangeFromValidity(validity) : undefined);
  const condition = validity ? runsConditionLabel(validity) : undefined;

  return {
    title: parsed.title,
    prize: parsed.prize,
    description:
      options.description ?? buildDefaultDescription(parsed, !!validity) ?? '',
    imgURL: imageUrl,
    snippetDetailsName: isVip ? `${slug}-vip` : slug,
    imgURLDesktop: options.imageUrlDesktop ?? '',
    bonusCode: parsed.code,
    buttonTitle,
    link: { ...DEFAULT_TERMS_LINK, ...options.termsLink },
    ...groupFilters,
    ...(isVip ? { signInOnly: true as const } : {}),
    type: options.cardType ?? 'medium',
    ...(dateRange ? { dateRange } : {}),
    ...(condition ? { condition } : {}),
  };
}

/**
 * Builds BH's leaner listing card (BhCompactCard) from just the fields
 * `PromoParserService.parseCompactCardFields` extracts — no T&C parsing,
 * no segment inference; visibility groups and the image are caller-
 * supplied since this shape has no default to fall back to. Unlike the
 * full card's buttonTitle, this uses the brief's Button line verbatim (no
 * toTitleCase) to match the target shape's "GET BONUS" as-written.
 */
export function buildBhCompactCard(
  fields: CompactCardFields,
  options: CompactCardOptions,
): BhCompactCard {
  return {
    title: fields.title,
    prize: fields.pool,
    description: `<span>Deposit ${fields.depositText}+ → ${fields.freeSpinsCount} FS (wager x${fields.wagerMultiplier})</span> <br/><span>Code: ${fields.code}</span>`,
    imgURL: options.imageUrl,
    snippetDetailsName: options.snippetDetailsName,
    imgURLDesktop: options.imageUrlDesktop ?? '',
    bonusCode: fields.code,
    buttonTitle: fields.buttonText ?? 'Get Bonus',
    link: { ...DEFAULT_TERMS_LINK },
    allowedForGroups: options.allowedForGroups,
    disallowedForGroups: options.disallowedForGroups,
    type: 'medium',
  };
}

export function renderBh(
  parsed: ParsedPromo,
  imageUrl: string,
  overrides: Map<string, string>,
  options: PromoSegmentOptions = {},
): PromoRenderResult {
  // An evergreen brief with no validity sentence at all is valid input too
  // — the card just omits dateRange/condition then, see buildCard.
  const validity = tryParseValidityLabels(parsed.termsRawText);
  const rulesHtml = renderBhRulesHtml(parsed, overrides);
  return {
    card: buildCard(parsed, imageUrl, validity, options),
    rulesHtml,
    template: buildPromoPageTemplate(parsed, imageUrl, rulesHtml),
  };
}
