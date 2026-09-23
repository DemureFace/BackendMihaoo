import { normalizeCurrency, parseAmount } from './tournament-parser.util';

const AMOUNT = '\\d{1,3}(?:[.,\\s]\\d{3})*(?:[.,]\\d+)?';
const CURRENCY_WORD = 'EUR|USD|GBP';
const CURRENCY_SYMBOL = '€|\\$|£';

// Rules text mixes suffixed ("25,000,000 EUR") and prefixed ("€350,000")
// money mentions within the same brief — both are matched here.
const MONEY_PATTERN = new RegExp(
  `(${AMOUNT})\\s*(${CURRENCY_WORD}|${CURRENCY_SYMBOL})|(${CURRENCY_SYMBOL})\\s*(${AMOUNT})`,
  'gi',
);

const SUBSCRIPTION_KEYWORD = /enable a subscription/i;
const TERMS_KEYWORD = /General Terms and Conditions/i;

const SUBSCRIPTION_LI = `{props.common.player?.isSignedIn ? (
                    <li>You can receive updates about this tournament via email and SMS. Please
                      <a href="/profile/general/info">
                        enable a subscription in your profile
                      </a>.
                    </li>
                  ) : (
                    <li>You can receive updates about this tournament via email and SMS. Please enable a subscription in your profile.</li>
                  )}`;

const TERMS_LI = `<li>
                    <a href="/terms-and-conditions">
                      General Terms and Conditions
                    </a> apply.
                  </li>`;

// JSX text content can't contain a bare "<" or ">" (e.g. the arrow in
// "Bet €1 and win €50 => Score = 50" is a hard parse error, not just a
// lint warning) — escape them in the source prose before any tags
// (money snippets, <br/>) get inserted, so those inserted tags are never
// touched by this pass.
function escapeAngleBrackets(text: string): string {
  return text.replace(/</g, "{'<'}").replace(/>/g, "{'>'}");
}

function moneyToSnippetName(amountText: string, currencyText: string): string {
  // Normalizes via parseAmount first so "0.50" and "0.5" both yield "05" —
  // a naive \D-strip on "0.50" would wrongly produce "050".
  const value = parseAmount(amountText);
  const normalized = value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  const digits = normalized.replace(/\D/g, '');
  const currency = normalizeCurrency(currencyText).toLowerCase();
  return `currencies-${digits}${currency}`;
}

function substituteMoney(text: string): string {
  return (
    text
      .replace(
        MONEY_PATTERN,
        (
          _match: string,
          suffixedAmount: string | undefined,
          suffixedCurrency: string | undefined,
          prefixedCurrency: string | undefined,
          prefixedAmount: string | undefined,
        ) => {
          const amount = suffixedAmount ?? prefixedAmount ?? '0';
          const currency = suffixedCurrency ?? prefixedCurrency ?? 'EUR';
          const name = moneyToSnippetName(amount, currency);
          return `<Components.Snippet templateName="${name}" />`;
        },
      )
      // A literal space directly before a tag is only rendered reliably while
      // it stays on the same line as the tag — if a formatter later wraps the
      // line right there, JSX drops whitespace adjacent to a tag instead of
      // collapsing it to a space. `{' '}` is an explicit JSX space expression,
      // so it survives any later line-wrapping/reformatting.
      .replace(/ (?=<Components\.Snippet)/g, "{' '}")
  );
}

/**
 * Turns the plain-text "TOURNAMENT RULES" paragraphs into the <ul><li>...</li></ul>
 * markup, substituting money mentions with currency Snippet components. The
 * subscription/terms lines are always the same boilerplate JSX (with the
 * isSignedIn conditional), so they're recognized by keyword and hardcoded
 * rather than reconstructed from prose.
 */
export function renderRulesList(paragraphs: string[]): string {
  const items = paragraphs.map((paragraph) => {
    if (SUBSCRIPTION_KEYWORD.test(paragraph)) return SUBSCRIPTION_LI;
    if (TERMS_KEYWORD.test(paragraph)) return TERMS_LI;

    const withMoney = substituteMoney(escapeAngleBrackets(paragraph));
    const withLineBreaks = withMoney.replace(/\n/g, '<br/>\n');
    return `<li>${withLineBreaks}</li>`;
  });

  return `<ul>\n${items.map((item) => `  ${item}`).join('\n')}\n</ul>`;
}
