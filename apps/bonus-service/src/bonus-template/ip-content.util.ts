import { parseAmount } from './promo-parser.util';

interface IpCurrencyRule {
  rate: number;
  symbol: string;
  thousandsSeparator: string;
  decimalSeparator: string;
  symbolPosition: 'before' | 'after';
  spaced: boolean;
}

// Fixed locale set + per-locale format for the "content-by-ip" CMS block.
// Unlike tournament-service's currency-locale.util.ts, only "no" applies a
// real rate conversion (777 -> 7,770 kr) — au/nz/ca/kw just swap in "$" at
// the same numeric amount, per the spec example.
const IP_CURRENCY_RULES: Record<string, IpCurrencyRule> = {
  au: {
    rate: 1,
    symbol: '$',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    spaced: false,
  },
  nz: {
    rate: 1,
    symbol: '$',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    spaced: false,
  },
  ca: {
    rate: 1,
    symbol: '$',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    spaced: false,
  },
  kw: {
    rate: 1,
    symbol: '$',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    spaced: false,
  },
  de: {
    rate: 1,
    symbol: '€',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    symbolPosition: 'after',
    spaced: true,
  },
  at: {
    rate: 1,
    symbol: '€',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    symbolPosition: 'after',
    spaced: true,
  },
  ch: {
    rate: 1,
    symbol: '€',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    symbolPosition: 'after',
    spaced: true,
  },
  es: {
    rate: 1,
    symbol: '€',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    symbolPosition: 'after',
    spaced: true,
  },
  it: {
    rate: 1,
    symbol: '€',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    spaced: false,
  },
  pt: {
    rate: 1,
    symbol: '€',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    symbolPosition: 'after',
    spaced: false,
  },
  no: {
    rate: 10,
    symbol: 'kr',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'after',
    spaced: true,
  },
};
const IP_CONTENT_LOCALES = Object.keys(IP_CURRENCY_RULES);
// "default" mirrors the EUR/"it"-style formatting (€ before, no space).
const DEFAULT_RULE = IP_CURRENCY_RULES.it;

const EURO_PATTERN = /€\s*([\d.,]+)|([\d.,]+)\s*€/g;

export function containsEuroAmount(text: string): boolean {
  return new RegExp(EURO_PATTERN.source, EURO_PATTERN.flags).test(text);
}

function formatGroupedInteger(value: number, separator: string): string {
  return Math.trunc(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function formatAmount(amount: number, rule: IpCurrencyRule): string {
  const scaled = amount * rule.rate;
  const intPart = Math.trunc(scaled);
  const grouped = formatGroupedInteger(intPart, rule.thousandsSeparator);
  const fracHundredths = Math.round((scaled - intPart) * 100);
  if (fracHundredths === 0) return grouped;
  const frac = fracHundredths.toString().padStart(2, '0');
  const trimmedFrac = frac.endsWith('0') ? frac.slice(0, 1) : frac;
  return `${grouped}${rule.decimalSeparator}${trimmedFrac}`;
}

function placeSymbol(numberStr: string, rule: IpCurrencyRule): string {
  if (rule.symbolPosition === 'before') {
    return rule.spaced
      ? `${rule.symbol} ${numberStr}`
      : `${rule.symbol}${numberStr}`;
  }
  return rule.spaced
    ? `${numberStr} ${rule.symbol}`
    : `${numberStr}${rule.symbol}`;
}

// Converts every "€X" / "X€" mention in `text` to the given locale's
// format — handles text with more than one euro amount (e.g. several
// deposit-tier lines), each converted independently.
function convertText(text: string, rule: IpCurrencyRule): string {
  return text.replace(
    EURO_PATTERN,
    (_match, prefixed?: string, suffixed?: string) => {
      const amount = parseAmount(prefixed ?? suffixed ?? '0');
      return placeSymbol(formatAmount(amount, rule), rule);
    },
  );
}

/**
 * Wraps `text` in a "content-by-ip" CMS block, one variant per locale with
 * every euro amount in `text` converted to that locale's currency/format.
 * `text` must contain at least one "€X" or "X€" mention.
 */
export function buildIpContentSnippet(text: string): string {
  const entries = IP_CONTENT_LOCALES.map(
    (locale) =>
      `        ${locale}: '${convertText(text, IP_CURRENCY_RULES[locale])}',`,
  );
  entries.push(`        default: '${convertText(text, DEFAULT_RULE)}',`);

  return `<Components.Block
      templateName="content-by-ip"
      ipContent={{
${entries.join('\n')}
      }}
    />`;
}
