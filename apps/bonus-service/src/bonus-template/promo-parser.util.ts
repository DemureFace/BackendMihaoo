const CURRENCY_ALIASES: Record<string, string> = {
  '€': 'EUR',
  $: 'USD',
  '£': 'GBP',
};

export function normalizeCurrency(raw: string): string {
  const trimmed = raw.trim();
  return (CURRENCY_ALIASES[trimmed] ?? trimmed).toUpperCase();
}

export function parseAmount(raw: string): number {
  const cleaned = raw.trim().replace(/\s+/g, '');
  if (/^\d+,\d{1,2}$/.test(cleaned)) {
    return parseFloat(cleaned.replace(',', '.'));
  }
  return parseFloat(cleaned);
}
