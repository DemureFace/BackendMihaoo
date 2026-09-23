const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

const CURRENCY_ALIASES: Record<string, string> = {
  '€': 'EUR',
  $: 'USD',
  '£': 'GBP',
};

const TIMEZONE_ALIASES: Record<string, string> = {
  CET: 'Europe/Berlin',
  CEST: 'Europe/Berlin',
  UTC: 'UTC',
  GMT: 'UTC',
};

export function normalizeCurrency(raw: string): string {
  const trimmed = raw.trim();
  return (CURRENCY_ALIASES[trimmed] ?? trimmed).toUpperCase();
}

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency.toUpperCase();
}

export function parseAmount(raw: string): number {
  const cleaned = raw.trim().replace(/\s+/g, '');

  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return parseInt(cleaned.replace(/\./g, ''), 10);
  }
  if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
    return parseInt(cleaned.replace(/,/g, ''), 10);
  }
  if (/^\d+,\d{1,2}$/.test(cleaned)) {
    return parseFloat(cleaned.replace(',', '.'));
  }
  return parseFloat(cleaned);
}

/**
 * Converts a civil wall-clock date/time in `tzLabel` (e.g. "CET", which this
 * business writes even during CEST) to a UTC ISO string, honoring DST via Intl.
 */
export function zonedTimeToUtcIso(
  dateStr: string,
  timeStr: string,
  tzLabel: string,
): string {
  const [day, month, year] = dateStr.split('.').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  const timeZone = TIMEZONE_ALIASES[tzLabel.toUpperCase()] ?? tzLabel;

  const asUtcGuess = Date.UTC(year, month - 1, day, hour, minute);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(asUtcGuess));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const asZoned = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );

  const offsetMs = asZoned - asUtcGuess;
  return new Date(asUtcGuess - offsetMs).toISOString();
}
