import { normalizeCurrency, parseAmount } from './tournament-parser.util';

const AMOUNT = '\\d{1,3}(?:[.,\\s]\\d{3})*(?:[.,]\\d+)?';
const CURRENCY_WORD = 'EUR|USD|GBP';
const CURRENCY_SYMBOL = '€|\\$|£';

// Ordinary-tournament briefs write amounts either suffixed ("0,5 EUR", "10€")
// or prefixed ("€0.50", "€10") — unlike network briefs, which are always
// suffixed — so both orders are matched here.
const MONEY_PATTERN = new RegExp(
  `(${AMOUNT})\\s*(${CURRENCY_WORD}|${CURRENCY_SYMBOL})|(${CURRENCY_SYMBOL})\\s*(${AMOUNT})`,
  'gi',
);

function toSnippetDigits(amountText: string): string {
  const value = parseAmount(amountText);
  const normalized = value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return normalized.replace(/\D/g, '');
}

function moneyToSnippetName(amountText: string, currencyText: string): string {
  const currency = normalizeCurrency(currencyText).toLowerCase();
  return `currencies-${toSnippetDigits(amountText)}${currency}`;
}

function substituteMoney(text: string): string {
  return text
    .replace(
      MONEY_PATTERN,
      (
        _match: string,
        suffixedAmount: string | undefined,
        suffixedCurrency: string | undefined,
        prefixedCurrency: string | undefined,
        prefixedAmount: string | undefined,
      ) => {
        const amount = suffixedAmount ?? prefixedAmount;
        const currency = suffixedCurrency ?? prefixedCurrency;
        const name = moneyToSnippetName(amount as string, currency as string);
        return `<Components.Snippet templateName="${name}" />`;
      },
    )
    .replace(/ (?=<Components\.Snippet)/g, "{' '}");
}

export function renderOrdinaryDescription(paragraphs: string[]): string {
  return paragraphs
    .map((paragraph) => `              ${substituteMoney(paragraph)}`)
    .join('<br/>\n');
}

export function renderOrdinaryTerms(paragraphs: string[]): string {
  return paragraphs
    .map((paragraph) => `              <li>${substituteMoney(paragraph)}</li>`)
    .join('\n');
}
