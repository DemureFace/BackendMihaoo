import { BadRequestException } from '@nestjs/common';
import { ParsedPromo } from '../dto/parsed-promo.dto';
import { MwPromoCard } from '../dto/promo-card.dto';
import { PromoRenderResult } from '../dto/promo-render-result.dto';
import { containsEuroAmount } from '../ip-content.util';
import { moneyToSnippetName, substituteMoney } from '../money-snippet.util';
import { MwPageFields } from '../promo-parser.service';
import { slugify } from '../slug.util';
import { processPromoText } from '../text-substitution.util';
import { CompactCardOptions } from './render-options.type';

function required(value: string | undefined, field: string): string {
  if (!value) {
    throw new BadRequestException(
      `MW's card requires "${field}" — it has no promo text to derive it from`,
    );
  }
  return value;
}

/**
 * MW's lobby/listing card — mostly caller-supplied (see CompactCardOptions'
 * MW-only fields), unlike BH/SG's compact cards which parse deposit/FS/
 * wager/code out of a promo text — MW's card has no such content to parse.
 * `title`/`prize` can still come from a promo text's Header:/TEXT: lines
 * when one is sent (see BonusTemplateService.generateCompactCard).
 * `promotionLink` defaults to "/bonuses/<slugified title>" when omitted —
 * matches the pattern in every example seen so far. `category` has no
 * derivable source at all (nothing in prose signals it) and no sensible
 * default, so it's included as an empty string when not supplied rather
 * than blocking the request or guessing a value. `signInOnly` defaults to
 * true for every MW card (gated behind login, same as every example seen);
 * `showVipBadge` defaults to true as well, but only for the VIP segment
 * (`allowedForGroups` containing "all_vip") — both stay caller-overridable
 * since a specific campaign may still want to opt out. `snippetPrizeName`
 * is only included when `prize` actually has a euro amount to substitute —
 * a prize with no currency in it (e.g. "40 FS – ...") has nothing for that
 * snippet to name.
 */
export function buildMwCard(options: CompactCardOptions): MwPromoCard {
  const title = required(options.title, 'title');
  const prize = required(options.prize, 'prize');
  const isVip = (options.allowedForGroups ?? []).includes('all_vip');
  return {
    title,
    promotionLink: options.promotionLink ?? `/bonuses/${slugify(title)}`,
    imgURL: options.imageUrl,
    signInOnly: options.signInOnly ?? true,
    ...(isVip && { showVipBadge: options.showVipBadge ?? true }),
    prize,
    category: options.category ?? '',
    allowedForGroups: options.allowedForGroups,
    disallowedForGroups: options.disallowedForGroups,
    ...(containsEuroAmount(prize) && {
      snippetPrizeName: options.snippetDetailsName,
    }),
  };
}

/**
 * MW's page template built from a brief that skips MW's original rigid
 * body shape (no "Play X or Y and Z" closing line, no per-spin "at
 * <value>" tier clause) — see `PromoParserService.parseMwPageFields`.
 * Heading/intro/action text are reproduced verbatim from the brief rather
 * than rebuilt from a fixed sentence (unlike `renderMw`'s tier line, which
 * — like the tier block here — is still a fixed template, just a
 * different one, with the brief's own bullet glyph and a wagering line
 * `renderMw` doesn't have).
 */
export function buildMwFlexiblePageTemplate(
  fields: MwPageFields,
  imageUrl: string,
  overrides: Map<string, string>,
): string {
  const asParsed: ParsedPromo = {
    title: fields.title,
    prize: fields.prize,
    code: fields.code,
    heading: fields.heading,
    introText: fields.introText,
    bodyRawText: '',
    tiers: [],
    actionText: fields.actionText,
    gameLinks: fields.gameLinks,
    termsPoints: fields.termsPoints,
    termsRawText: '',
  };
  // The T&C's own "... Free Spins on <Game> by <Studio>." sentence is
  // where the game name was sourced from in the first place — it reads as
  // plain prose there (only the intro paragraph auto-links the mention).
  const asParsedNoGameLinks: ParsedPromo = { ...asParsed, gameLinks: [] };

  const introJsx = processPromoText(fields.introText, asParsed, overrides);
  const actionJsx = processPromoText(fields.actionText, asParsed, overrides);

  const tierLines = fields.tiers.map((tier) => {
    const depositSnippet = substituteMoney(tier.depositText, overrides);
    return `${fields.tierEmoji} <b>${depositSnippet}+ Deposit – get ${tier.freeSpinsCount} FS</b>`;
  });
  const tierBlock = [
    ...tierLines,
    `${fields.tierEmoji} <b>Wagering</b> – <b>x${fields.wagerMultiplier}</b>`,
  ].join('<br/>');

  const termsJsx = fields.termsPoints
    .map((point, idx) => {
      const withBreaks = point.replace(/\n/g, '<br/>');
      return `<b>${idx + 1}.</b> ${processPromoText(withBreaks, asParsedNoGameLinks, overrides)}`;
    })
    .join('<br/>');

  return `<Components.Block
                  templateName={'cms-page'}
                  mod={'promotion'}
                  typePage={'promotion'}
                  containerMod={'cms'}
                  >
  <Components.Block
            templateName="promotion-page"
            title="${fields.title}"
            prize="${fields.prize}"
            imgUrl="${imageUrl}"
           >
<Components.Block templateName="bonus-code-field" code={"${fields.code}"}>
</Components.Block>
      <h3>${fields.heading}</h3>
<p>
${introJsx}
</p>
<p>
Use code <b>${fields.code}</b>:<br/>
${tierBlock}
</p>
<h4>
  ${actionJsx}<br/>
    </h4>
    <Components.Block
            templateName={'collapse-block'}
            title={'Bonus Rules'}
            className="promotion-page__collapse"
          >
<p>
${termsJsx}
      </p>
          </Components.Block>
  </Components.Block>
</Components.Block>`;
}

export function renderMw(
  parsed: ParsedPromo,
  imageUrl: string,
  overrides: Map<string, string>,
): PromoRenderResult {
  const introJsx = processPromoText(parsed.introText, parsed, overrides);

  const tierLines = parsed.tiers
    .map((tier) => {
      if (!tier.freeSpinValue) {
        throw new BadRequestException(
          `MW's page requires an "at <amount>" free-spin value on the ` +
            `"Deposit ${tier.depositMin.amount}${tier.depositMin.currency}+ ... ${tier.freeSpinsCount} FS" tier line`,
        );
      }
      const depSnippet = `<Components.Snippet templateName="${moneyToSnippetName(tier.depositMin.amount, tier.depositMin.currency, overrides)}" />`;
      const valSnippet = `<Components.Snippet templateName="${moneyToSnippetName(tier.freeSpinValue.amount, tier.freeSpinValue.currency, overrides)}" />`;
      return `⚡ Deposit <b>${depSnippet}+ → ${tier.freeSpinsCount} FS at ${valSnippet}</b>`;
    })
    .join('<br/>');

  const gamesJsx = parsed.gameLinks
    .map((game) => `<a href="/game/${game.slug}"><b>${game.name}</b></a>`)
    .join(' or ');
  const actionJsx = processPromoText(parsed.actionText, parsed, overrides);

  const termsJsx = parsed.termsPoints
    .map((point, idx) => {
      const withBreaks = point.replace(/\n/g, '<br/>');
      return `<b>${idx + 1}.</b> ${processPromoText(withBreaks, parsed, overrides)}`;
    })
    .join('<br/>');

  const template = `<Components.Block
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
      <h3>${parsed.heading}</h3>
<p>
<br/>${introJsx}<br/>
</p>

<p>
${tierLines}
</p>

<h4>
  Play ${gamesJsx} and ${actionJsx}.<br/>
    </h4>

    <Components.Block
            templateName={'collapse-block'}
            title={'Bonus Rules'}
            className="promotion-page__collapse"
          >
<p>
${termsJsx}
      </p>
          </Components.Block>
  </Components.Block>
</Components.Block>`;

  return { template };
}
