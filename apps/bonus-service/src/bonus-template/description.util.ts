import { ParsedPromo } from './dto/parsed-promo.dto';

// Unlike TIER_PATTERN in promo-parser.service.ts (which only captures the FS
// *count*, discarding any qualifier word before "FS"), this keeps the whole
// "20 FS" / "20 High-Bet FS" phrase intact — the card description shows it
// verbatim, the way the brief itself wrote it. The leading "Deposit" word is
// optional — some briefs state the tier bare ("€50+ → 25 FS") once the
// intro sentence has already said "make a deposit" once for the whole list.
const TIER_LABEL_PATTERN =
  /(?:Deposit\s*)?([€$£])?\s*([\d.,]+)\+?\s*(?:→|-|–|—)\s*(?:get\s*)?(\d+(?:\s+[A-Za-z][\w-]*)*\s*FS)\b/gi;

// Covers the wager-multiplier phrasings seen across briefs so far: "Wager(ing):
// xN", "xN wager(ing)", and the spelled-out "wagered N times" form T&C prose
// tends to use instead of the shorthand.
const WAGER_PATTERNS = [
  /Wager(?:ing)?:?\s*[x×]\s*(\d+)/gi,
  /[x×]\s*(\d+)\s*wager(?:ing)?\b/gi,
  /wager(?:ed)?\s+(\d+)\s+times/gi,
];

function findWagerMultipliers(text: string): number[] {
  const found: number[] = [];
  for (const pattern of WAGER_PATTERNS) {
    for (const match of text.matchAll(pattern)) found.push(Number(match[1]));
  }
  return found;
}

// Matches a deposit-match bonus's T&C sentence, e.g. "To receive a 50%
// bonus up to €100, make a qualifying deposit of at least €30 using promo
// code REFILL." — the percentage/cap read first, the deposit minimum second
// (the order this phrasing has consistently used so far).
const PERCENT_BONUS_PATTERN =
  /(\d+)%\s*bonus\s*up\s*to\s*([€$£])?\s*([\d.,]+)[^.]*?deposit\s*(?:of\s*at\s*least|\+)?\s*([€$£])?\s*([\d.,]+)/is;

/** Percentage-match bonuses (e.g. "50% up to €100") have no "Deposit ...
 * FS" tier at all, so they need their own shape — matches the established
 * "Deposit X+ → N%<br/>Bonus up to Y (wager xN)<br/>..." card wording. */
function buildPercentBonusDescription(parsed: ParsedPromo): string | undefined {
  const match = parsed.termsRawText.match(PERCENT_BONUS_PATTERN);
  if (!match) return undefined;
  // `[\d.,]+` for the amount groups can pick up a sentence's trailing comma
  // (e.g. "up to €100," before the clause continues) — strip it back off.
  const [, pct, maxSymbol, maxAmountRaw, minSymbol, minAmountRaw] = match;
  const maxAmount = maxAmountRaw.replace(/[.,]+$/, '');
  const minAmount = minAmountRaw.replace(/[.,]+$/, '');

  const wagers = findWagerMultipliers(parsed.termsRawText);
  const wagerSuffix = wagers.length === 1 ? ` (wager x${wagers[0]})` : '';

  return (
    `Deposit ${minSymbol ?? maxSymbol ?? '€'}${minAmount}+ → ${pct}%<br/>` +
    `Bonus up to ${maxSymbol ?? '€'}${maxAmount}${wagerSuffix}<br/> <div> Bonus Code: ${parsed.code}</div>`
  );
}

/**
 * Evergreen offers (no "runs from X to Y" validity sentence at all, e.g. a
 * standing "Game of the Month") use a leaner tier line with no wager shown
 * — "Min dep X | <span>Y Free Spins</span>" per tier, plus the code —
 * rather than the dated format's "Deposit X+ → Y FS (wager xN)".
 */
function buildDatelessTierDescription(parsed: ParsedPromo): string | undefined {
  const tierMatches = [...parsed.bodyRawText.matchAll(TIER_LABEL_PATTERN)];
  if (tierMatches.length === 0) return undefined;

  const lines = tierMatches.map(([, symbol, amount, fsLabel]) => {
    const fsCount = fsLabel.match(/\d+/)?.[0] ?? fsLabel.trim();
    return `Min dep ${symbol ?? '€'}${amount} | <span>${fsCount} Free Spins</span>`;
  });

  return `${lines.join(' <br/> ')} <br/> <span>Code: ${parsed.code}</span>`;
}

/**
 * Builds the card's default `description` blurb straight from the promo
 * text, for callers that don't pass `options.description` explicitly.
 * `hasDateRange` (whether the caller found a validity sentence to compute
 * the card's `dateRange`/`condition` from) picks the wording:
 *
 * - With a date range: one "Deposit X+ → Y FS (wager xN)" line per tier,
 *   plus the bonus code — matches the format SG/BH's dated card
 *   descriptions already use by hand. Wager attribution: if the T&C states
 *   as many multiplier mentions as there are tiers, they're paired in the
 *   order each appears (covers briefs with a different multiplier per
 *   tier); if it states exactly one, that single value is applied to every
 *   tier (covers a shared "wagered N times" clause like Opening Pour's).
 *   Any other count is ambiguous, so the "(wager xN)" suffix is left off
 *   rather than risk attaching a wrong number to a tier — wagering terms
 *   are compliance text, not a cosmetic detail worth guessing.
 * - Without one (an evergreen offer): `buildDatelessTierDescription`'s
 *   leaner "Min dep X | <span>Y Free Spins</span>" shape instead, since
 *   these briefs also tend not to state a single unambiguous wager at all.
 *
 * Falls back to a percentage-match bonus shape (`buildPercentBonusDescription`)
 * when the text has no "Deposit ... FS" tier at all — and to undefined
 * (letting the caller fall back to '') when nothing is recognized.
 */
export function buildDefaultDescription(
  parsed: ParsedPromo,
  hasDateRange: boolean,
): string | undefined {
  if (!hasDateRange) {
    return (
      buildDatelessTierDescription(parsed) ??
      buildPercentBonusDescription(parsed)
    );
  }

  const tierMatches = [...parsed.bodyRawText.matchAll(TIER_LABEL_PATTERN)];
  if (tierMatches.length === 0) return buildPercentBonusDescription(parsed);

  const wagers = findWagerMultipliers(parsed.termsRawText);
  const wagerFor = (index: number): number | undefined => {
    if (wagers.length === tierMatches.length) return wagers[index];
    if (wagers.length === 1) return wagers[0];
    return undefined;
  };

  const lines = tierMatches.map((match, index) => {
    const [, symbol, amount, fsLabel] = match;
    const wager = wagerFor(index);
    const wagerSuffix = wager !== undefined ? ` (wager x${wager})` : '';
    return `Deposit ${symbol ?? '€'}${amount}+ → ${fsLabel.replace(/\s+/g, ' ').trim()}${wagerSuffix}`;
  });

  return `${lines.join('<br/>')}<br/> <div> Bonus Code: ${parsed.code}</div>`;
}
