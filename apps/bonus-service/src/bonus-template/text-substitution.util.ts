import { GameLink, ParsedPromo } from './dto/parsed-promo.dto';
import { substituteMoney } from './money-snippet.util';

// "General " is optional — BH/SG's sentence says "General Bonus Terms and
// Conditions", but MW's says just "Bonus Terms and Conditions" with no
// "General" prefix. Whichever is present gets linked+bolded as a whole.
const TERMS_PHRASE_PATTERN = /(?:General\s+)?Bonus Terms and Conditions/g;
const TERMS_HREF = '/bonus-terms-and-conditions';

export function boldCode(text: string, code: string): string {
  if (!code) return text;
  const pattern = new RegExp(`\\b${code}\\b`, 'g');
  return text.replace(pattern, `<b>${code}</b>`);
}

export function linkGames(text: string, gameLinks: GameLink[]): string {
  let result = text;
  for (const { name, slug } of gameLinks) {
    result = result
      .split(name)
      .join(`<a href="/game/${slug}"><b>${name}</b></a>`);
  }
  return result;
}

/** MW/SG both bold the anchor text; BH's own T&C sentence doesn't, so it links it inline instead. */
export function linkTermsBold(text: string): string {
  return text.replace(
    TERMS_PHRASE_PATTERN,
    (whole) => `<a href="${TERMS_HREF}"><b>${whole}</b></a>`,
  );
}

export function toTitleCase(text: string): string {
  return text.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * The CMS's HTML-string-to-component rendering drops a plain space that
 * sits immediately before an opening tag (confirmed against the live BH
 * page: "from <b>August" rendered as "fromAugust", while "Welcome</b>
 * promotion" — space *after* a closing tag — came through fine). A U+00A0
 * non-breaking space at that exact spot displays identically to a normal
 * space (unlike the literal "&nbsp;" entity text, which is legible as
 * markup in a raw-string view) — chosen over the entity on the
 * understanding that if the CMS's own whitespace-stripping turns out to
 * use a generic "is this whitespace" check, U+00A0 satisfies that check
 * too and could still be dropped, unlike the entity text.
 */
export function preserveTagAdjacentSpaces(html: string): string {
  return html.replace(/ (?=<)/g, ' ');
}

/** Shared substitution pipeline for brands (MW, SG) that render generic prose T&C points. */
export function processPromoText(
  text: string,
  parsed: ParsedPromo,
  overrides: Map<string, string>,
): string {
  let result = substituteMoney(text, overrides);
  result = boldCode(result, parsed.code);
  result = linkGames(result, parsed.gameLinks);
  result = linkTermsBold(result);
  return result;
}
