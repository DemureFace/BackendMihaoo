import { normalizeCurrency } from './promo-parser.util';

const MONEY_PATTERN =
  /([€$£])\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(EUR|USD|GBP)\b/gi;

const OVERRIDE_KEY_PATTERN = /^([€$£])?\s*(\d+(?:[.,]\d+)?)\s*([A-Za-z]{3})?$/;

/**
 * Mirrors the business's existing "currencies-{amount}{currency}" CMS
 * snippet naming: whole amounts keep their digits as-is (20 -> "20"),
 * fractional amounts drop the decimal point after trimming any trailing
 * zero (0.20 -> "0.2" -> "02").
 */
function formatAmountDigits(amount: number): string {
  if (Number.isInteger(amount)) return String(amount);
  const trimmed = amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return trimmed.replace('.', '');
}

function overrideKey(amount: number, currency: string): string {
  return `${amount}${normalizeCurrency(currency)}`;
}

/**
 * Some snippet IDs (e.g. a free-spin value quoted in EUR/AUD/NZD at once)
 * are pre-existing CMS snippets that don't follow the plain
 * amount+currency formula and can't be derived from the text alone.
 * `raw` lets a caller point a specific money mention (as it appears in the
 * source text, e.g. "€1") at the exact snippet name to use instead.
 */
export function buildSnippetOverrideMap(
  raw: Record<string, string> | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;

  for (const [rawKey, value] of Object.entries(raw)) {
    const match = rawKey.trim().match(OVERRIDE_KEY_PATTERN);
    if (!match) continue;
    const [, symbol, amountText, code] = match;
    const currency = normalizeCurrency(code ?? symbol ?? 'EUR');
    const amount = parseFloat(amountText.replace(',', '.'));
    const name = value.startsWith('currencies-')
      ? value.slice('currencies-'.length)
      : value;
    map.set(overrideKey(amount, currency), name);
  }
  return map;
}

export function moneyToSnippetName(
  amount: number,
  currency: string,
  overrides: Map<string, string>,
): string {
  const currencyNorm = normalizeCurrency(currency);
  const override = overrides.get(overrideKey(amount, currencyNorm));
  if (override) return `currencies-${override}`;
  return `currencies-${formatAmountDigits(amount)}${currencyNorm.toLowerCase()}`;
}

export function snippetTag(
  amount: number,
  currency: string,
  overrides: Map<string, string>,
): string {
  return `<Components.Snippet templateName="${moneyToSnippetName(amount, currency, overrides)}" />`;
}

/**
 * Replaces every money mention in `text` (e.g. "€20", "0.2 EUR") with the
 * matching Components.Snippet tag.
 */
export function substituteMoney(
  text: string,
  overrides: Map<string, string>,
): string {
  return text.replace(
    MONEY_PATTERN,
    (_match, symbol?: string, amtA?: string, amtB?: string, code?: string) => {
      const amount = parseFloat((amtA ?? amtB ?? '0').replace(',', '.'));
      const currency = normalizeCurrency(code ?? symbol ?? 'EUR');
      return snippetTag(amount, currency, overrides);
    },
  );
}
