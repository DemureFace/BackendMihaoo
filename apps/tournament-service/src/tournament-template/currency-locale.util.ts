export interface CurrencyLocaleRule {
  rate: number;
  symbol: string;
  thousandsSeparator: string;
  decimalSeparator: string;
  symbolPosition: 'before' | 'after';
  spaced: boolean;
}

/**
 * Per-locale conversion rate (relative to a EUR base amount) and display
 * format, from the business's currency rules table. Locales not listed here
 * fall back to DEFAULT_CURRENCY_RULE.
 */
const CURRENCY_LOCALE_RULES: Record<string, CurrencyLocaleRule> = {
  en: {
    rate: 1,
    symbol: '€',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    spaced: false,
  },
  it: {
    rate: 1,
    symbol: '€',
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
  es: {
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
  fr: {
    rate: 1,
    symbol: '€',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'after',
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
  au: {
    rate: 1.5,
    symbol: '$',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    spaced: false,
  },
  nz: {
    rate: 1.5,
    symbol: '$',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
    spaced: false,
  },
  ca: {
    rate: 1.5,
    symbol: '$',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before',
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

const DEFAULT_CURRENCY_RULE = CURRENCY_LOCALE_RULES.en;

export const CURRENCY_LOCALE_CODES = Object.keys(CURRENCY_LOCALE_RULES);

function formatGroupedInteger(value: number, separator: string): string {
  return Math.trunc(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function formatNumber(value: number, rule: CurrencyLocaleRule): string {
  const intPart = Math.trunc(value);
  const groupedInt = formatGroupedInteger(intPart, rule.thousandsSeparator);

  const fracHundredths = Math.round((value - intPart) * 100);
  if (fracHundredths === 0) return groupedInt;

  const frac = fracHundredths.toString().padStart(2, '0');
  const trimmedFrac = frac.endsWith('0') ? frac.slice(0, 1) : frac;
  return `${groupedInt}${rule.decimalSeparator}${trimmedFrac}`;
}

function placeSymbol(numberStr: string, rule: CurrencyLocaleRule): string {
  if (rule.symbolPosition === 'before') {
    return rule.spaced
      ? `${rule.symbol} ${numberStr}`
      : `${rule.symbol}${numberStr}`;
  }
  return rule.spaced
    ? `${numberStr} ${rule.symbol}`
    : `${numberStr}${rule.symbol}`;
}

export function formatCurrencyForLocale(
  amountEur: number,
  locale: string,
): string {
  const rule = CURRENCY_LOCALE_RULES[locale] ?? DEFAULT_CURRENCY_RULE;
  return placeSymbol(formatNumber(amountEur * rule.rate, rule), rule);
}

export function buildLocalizedAmounts(
  amountEur: number,
  locales: string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const locale of locales) {
    result[locale] = formatCurrencyForLocale(amountEur, locale);
  }
  return result;
}

/**
 * One "ipPool"-style object per locale: every locale keeps the same full
 * breakdown, but `default` mirrors that specific locale's own value — for
 * when the page itself is built/served per-locale and `default` is what the
 * page actually reads at render time.
 */
export function buildIpPoolVariants(
  amountEur: number,
  locales: string[],
): Record<string, Record<string, string>> {
  const values = buildLocalizedAmounts(amountEur, locales);
  const variants: Record<string, Record<string, string>> = {};
  for (const locale of locales) {
    variants[locale] = { ...values, default: values[locale] };
  }
  return variants;
}
