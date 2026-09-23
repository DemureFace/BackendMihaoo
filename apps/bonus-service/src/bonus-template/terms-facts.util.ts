import { BadRequestException } from '@nestjs/common';
import { ValidityLabels } from './date-label.util';
import { DepositTier, MoneyAmount } from './dto/parsed-promo.dto';
import { normalizeCurrency, parseAmount } from './promo-parser.util';

export interface TermsTier {
  fsCount: number;
  depositMin: MoneyAmount;
  wagerMultiplier: number;
  maxWin: MoneyAmount;
}

export type SpinValueFact =
  | { mode: 'uniform'; value: MoneyAmount }
  | { mode: 'per-tier'; valuesByFsCount: Record<number, MoneyAmount> };

export interface TermsFacts {
  validFromLabel: string;
  validToLabel: string;
  tiers: TermsTier[];
  fsValidDays: number;
  maxBetWagering: MoneyAmount;
  spinValue: SpinValueFact;
  trailingClause: 'no-max-bet-limit' | 'currency-conversion';
  brandPossessive: string;
}

function fail(field: string): never {
  throw new BadRequestException(
    `Could not parse "${field}" from T&C text for the structured rules template`,
  );
}

function money(symbol: string | undefined, amountText: string): MoneyAmount {
  return {
    amount: parseAmount(amountText),
    currency: normalizeCurrency(symbol ?? '€'),
  };
}

// Per-tier lines refer to a tier either as "N free spin(s) bonus" (BH/MW
// style) or the abbreviated "N FS", and separate the label from its value
// with an em dash, hyphen, or arrow — accept all of them everywhere a
// per-tier line is matched.
const FS_LABEL = 'free spins?\\s*bonus|FS';
const DASH = '—|-|→';

/**
 * Grabs the run of per-tier lines right after a matched intro sentence —
 * either "• N free spins bonus — ..." (bulleted, BH/MW style) or a plain
 * "N free spins bonus — ..." / "N FS → ..." sentence per line with no
 * bullet marker.
 */
function extractBulletSection(
  termsText: string,
  introPattern: RegExp,
): string | undefined {
  const match = termsText.match(introPattern);
  if (!match || match.index === undefined) return undefined;
  const after = termsText.slice(match.index + match[0].length);
  const bulletBlock = after.match(
    new RegExp(
      `^(?:[ \\t]*\\n)?((?:[ \\t]*(?:•\\s*)?\\d+\\s*(?:${FS_LABEL})[^\\n]*\\n?)+)`,
      'i',
    ),
  );
  return bulletBlock?.[1];
}

function parseBulletAmountsByFsCount(
  block: string,
): Record<number, MoneyAmount> {
  const result: Record<number, MoneyAmount> = {};
  const pattern = new RegExp(
    `(\\d+)\\s*(?:${FS_LABEL})\\s*(?:${DASH})\\s*([€$£])?\\s*([\\d.,]+)`,
    'gi',
  );
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(block))) {
    const [, fsCountText, symbol, amountText] = match;
    result[Number(fsCountText)] = money(symbol, amountText);
  }
  return result;
}

/**
 * Extracts just the validity-date labels out of the T&C text — the one
 * fact every brand's promo card needs (for its publish `dateRange` and
 * "Runs dd.mm - dd.mm" condition label) regardless of whether that brand
 * renders its rules generically (SG, and BH as of this change) or from a
 * fixed fact-based skeleton.
 */
export function parseValidityLabels(termsText: string): ValidityLabels {
  const labels = tryParseValidityLabels(termsText);
  if (!labels) fail('bonus validity dates');
  return labels;
}

/**
 * Same as `parseValidityLabels`, but for callers that treat an evergreen
 * brief (no "runs from X to Y" sentence at all, e.g. a standing "Game of
 * the Month" offer) as valid input rather than an error — the card then
 * omits `dateRange`/`condition` entirely instead of failing the request.
 */
export function tryParseValidityLabels(
  termsText: string,
): ValidityLabels | undefined {
  // Not anchored to a specific lead-in verb ("valid from", "runs from",
  // "available from", ...) since that wording varies by brief — the
  // "from <date> to <date>" shape is the reliable signal. The "from" side's
  // year is optional (defaults from the "to" side via parseDateLabel) since
  // some briefs state it explicitly ("from August 24, 2026 to ...") and
  // others omit it ("from August 6 to August 13, 2026").
  const validityMatch = termsText.match(
    /from\s+([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?)\s+to\s+([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i,
  );
  if (!validityMatch) return undefined;
  const [, validFromLabel, validToLabel] = validityMatch;
  return { validFromLabel, validToLabel };
}

/**
 * Extracts the variable "blanks" out of the recurring FS-deposit-bonus T&C
 * boilerplate (same structure across MW/BH, only the point grouping and
 * wrapper markup differ per brand — see mw.template.ts vs bh.template.ts).
 * Used by brand renderers that build a fixed numbered-clause skeleton
 * instead of MW's generic line-per-point rendering.
 */
export function parseTermsFacts(
  termsText: string,
  bodyTiers: DepositTier[],
): TermsFacts {
  const { validFromLabel, validToLabel } = parseValidityLabels(termsText);

  const wagerBlock = extractBulletSection(
    termsText,
    /wagering requires making bets as follows:\s*\n/i,
  );
  if (!wagerBlock) fail('wagering multipliers');
  const wagerPattern = new RegExp(
    `(\\d+)\\s*(?:${FS_LABEL})\\s*(?:${DASH})\\s*wager\\s*(\\d+)\\s*times`,
    'gi',
  );
  const wagerByFsCount: Record<number, number> = {};
  let wagerMatch: RegExpExecArray | null;
  while ((wagerMatch = wagerPattern.exec(wagerBlock))) {
    wagerByFsCount[Number(wagerMatch[1])] = Number(wagerMatch[2]);
  }

  const maxWinBlock = extractBulletSection(
    termsText,
    /transferred to your (?:real|active) balance[^\n]*\n/i,
  );
  if (!maxWinBlock) fail('max transferable amounts');
  const maxWinByFsCount = parseBulletAmountsByFsCount(maxWinBlock);

  const fsValidDaysMatch = termsText.match(/valid for\s*(\d+)\s*days?/i);
  if (!fsValidDaysMatch) fail('free spins validity period (days)');

  const maxBetMatch = termsText.match(
    /maximum bet amount when wagering is\s*([€$£])?\s*([\d.,]+)/i,
  );
  if (!maxBetMatch) fail('maximum bet amount when wagering');

  const perTierSpinBlock = extractBulletSection(
    termsText,
    /value of each free spin is:\s*\n/i,
  );
  const uniformSpinMatch = termsText.match(
    /value of each free spin is\s*([€$£])?\s*([\d.,]+)/i,
  );

  let spinValue: SpinValueFact;
  if (perTierSpinBlock) {
    spinValue = {
      mode: 'per-tier',
      valuesByFsCount: parseBulletAmountsByFsCount(perTierSpinBlock),
    };
  } else if (uniformSpinMatch) {
    spinValue = {
      mode: 'uniform',
      value: money(uniformSpinMatch[1], uniformSpinMatch[2]),
    };
  } else {
    fail('free spin value');
  }

  const trailingClause: TermsFacts['trailingClause'] =
    /another currency/i.test(termsText) || /active currency/i.test(termsText)
      ? 'currency-conversion'
      : 'no-max-bet-limit';

  const brandMatch = termsText.match(/acceptance of\s+([A-Za-z]+)['’]s/);
  if (!brandMatch) fail('brand name (from the T&C acceptance sentence)');

  const tiers: TermsTier[] = bodyTiers.map((tier) => {
    const wagerMultiplier = wagerByFsCount[tier.freeSpinsCount];
    const maxWin = maxWinByFsCount[tier.freeSpinsCount];
    if (wagerMultiplier === undefined) {
      fail(`wager multiplier for the ${tier.freeSpinsCount}-FS tier`);
    }
    if (!maxWin) {
      fail(`max transferable amount for the ${tier.freeSpinsCount}-FS tier`);
    }
    return {
      fsCount: tier.freeSpinsCount,
      depositMin: tier.depositMin,
      wagerMultiplier,
      maxWin,
    };
  });

  return {
    validFromLabel,
    validToLabel,
    tiers,
    fsValidDays: Number(fsValidDaysMatch[1]),
    maxBetWagering: money(maxBetMatch[1], maxBetMatch[2]),
    spinValue,
    trailingClause,
    brandPossessive: brandMatch[1],
  };
}
