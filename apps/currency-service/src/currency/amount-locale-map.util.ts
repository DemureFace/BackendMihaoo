interface AmountLocaleRule {
  rate: number;
  symbol: string;
  position: 'before' | 'after';
  thousandsSeparator: string;
  decimalSeparator: string;
  spaced: boolean;
}

// Self-contained rule table for the amount-breakdown parser — mirrors
// config/currency.config.ts's `rules`/`localesWithSpaceAfter`, but kept
// local (no DB, no NestJS DI) same as bonus-service's ip-content.util.ts.
const LOCALE_RULES: Record<string, AmountLocaleRule> = {
  au: {
    rate: 1.5,
    symbol: '$',
    position: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    spaced: false,
  },
  nz: {
    rate: 1.5,
    symbol: '$',
    position: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    spaced: false,
  },
  ca: {
    rate: 1.5,
    symbol: '$',
    position: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    spaced: false,
  },
  de: {
    rate: 1,
    symbol: '€',
    position: 'after',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    spaced: true,
  },
  at: {
    rate: 1,
    symbol: '€',
    position: 'after',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    spaced: true,
  },
  ch: {
    rate: 1,
    symbol: '€',
    position: 'after',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    spaced: true,
  },
  fr: {
    rate: 1,
    symbol: '€',
    position: 'after',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    spaced: false,
  },
  it: {
    rate: 1,
    symbol: '€',
    position: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    spaced: false,
  },
  no: {
    rate: 10,
    symbol: 'kr',
    position: 'after',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    spaced: true,
  },
  es: {
    rate: 1,
    symbol: '€',
    position: 'after',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    spaced: true,
  },
  pt: {
    rate: 1,
    symbol: '€',
    position: 'after',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    spaced: false,
  },
};
const INNER_LOCALES = Object.keys(LOCALE_RULES);

// Which inner locale's formatting each output-language block uses for its
// own "default" entry — "en" has no currency locale of its own, so it
// falls back to the generic EUR default (same "it"-style before/no-space
// convention used as DEFAULT_RULE in ip-content.util.ts).
const OUTER_DEFAULT_LOCALE: Record<string, string> = {
  en: 'it',
  de: 'de',
  au: 'au',
  fr: 'fr',
  it: 'it',
  no: 'no',
  es: 'es',
  pt: 'pt',
};
const OUTPUT_LANGUAGES = Object.keys(OUTER_DEFAULT_LOCALE);

// Accepts "5000€", "€5000", "5.000,50", "$5,000" (symbol is ignored — the
// input amount is always treated as EUR), returns the parsed number.
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^\d.,]/g, '');
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  const lastSep = Math.max(lastDot, lastComma);
  const hasDecimal = lastSep >= 0 && cleaned.length - lastSep <= 3;

  const normalized = hasDecimal
    ? `${cleaned.slice(0, lastSep).replace(/[.,]/g, '')}.${cleaned.slice(lastSep + 1)}`
    : cleaned.replace(/[.,]/g, '');

  const value = parseFloat(normalized);
  if (Number.isNaN(value)) {
    throw new Error(`Could not parse an amount out of "${input}"`);
  }
  return value;
}

function formatGroupedInteger(value: number, separator: string): string {
  return Math.trunc(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function formatAmount(amountEur: number, rule: AmountLocaleRule): string {
  const scaled = amountEur * rule.rate;
  const intPart = Math.trunc(scaled);
  const grouped = formatGroupedInteger(intPart, rule.thousandsSeparator);
  const fracHundredths = Math.round((scaled - intPart) * 100);
  const number =
    fracHundredths === 0
      ? grouped
      : `${grouped}${rule.decimalSeparator}${fracHundredths.toString().padStart(2, '0').replace(/0$/, '')}`;

  if (rule.position === 'before') {
    return rule.spaced ? `${rule.symbol} ${number}` : `${rule.symbol}${number}`;
  }
  return rule.spaced ? `${number} ${rule.symbol}` : `${number}${rule.symbol}`;
}

// Builds, for every output language, the full au/nz/ca/.../pt breakdown of
// `input` plus a "default" entry formatted in that language's own locale
// (or the generic EUR style for "en").
export function buildAmountLocaleMap(
  input: string,
): Record<string, Record<string, string>> {
  const amountEur = parseAmount(input);

  const innerMap: Record<string, string> = {};
  for (const locale of INNER_LOCALES) {
    innerMap[locale] = formatAmount(amountEur, LOCALE_RULES[locale]);
  }

  const result: Record<string, Record<string, string>> = {};
  for (const lang of OUTPUT_LANGUAGES) {
    result[lang] = {
      ...innerMap,
      default: innerMap[OUTER_DEFAULT_LOCALE[lang]],
    };
  }
  return result;
}

// Same data as buildAmountLocaleMap, rendered as the plain-text block
// format used for pasting into the CMS (single-quoted, trailing commas,
// one "lang:" header per block) — the currency-service equivalent of
// bonus-service's buildIpContentSnippet text output.
export function buildAmountLocaleMapText(input: string): string {
  const map = buildAmountLocaleMap(input);

  return OUTPUT_LANGUAGES.map((lang) => {
    const entries = Object.entries(map[lang]);
    const lines = entries.map(([locale, value], i) => {
      const comma = i === entries.length - 1 ? '' : ',';
      return `${locale}: '${value}'${comma}`;
    });
    return `${lang}: \n${lines.join('\n')}`;
  }).join('\n\n');
}
