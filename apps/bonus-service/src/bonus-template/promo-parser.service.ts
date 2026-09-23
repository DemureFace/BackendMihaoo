import { BadRequestException, Injectable } from '@nestjs/common';
import { DepositTier, GameLink, ParsedPromo } from './dto/parsed-promo.dto';
import { normalizeCurrency, parseAmount } from './promo-parser.util';
import { slugify } from './slug.util';

// Also accepts the English equivalent some briefs use instead of the
// Cyrillic phrase (e.g. landing-promo briefs written as "Promo page text").
const BODY_MARKER = /(?:текст\s*на\s*промо\s*сторінку|promo\s*page\s*text)/i;
// Some briefs skip the "Header:"/"TEXT:"/"Button:" labels entirely and mark
// the banner block with its own section header instead — "надпис на промо
// сторінку" ("banner text/caption for the promo page"), literally the same
// phrase as BODY_MARKER minus "текст" ("text") swapped for "надпис"
// ("caption") — followed by one plain line per field (title, then prize,
// then optionally the button text), no labels at all. Also accepts the
// English "Promo page banner" equivalent, same reasoning as BODY_MARKER.
const BANNER_MARKER =
  /(?:надпис\s*на\s*промо\s*сторінку|promo\s*page\s*banner)/i;
// Accepts either the short "T&C" form or a spelled-out "Terms & Conditions"/
// "Terms and Conditions" header — different briefs use different phrasing
// for the same section boundary.
const TERMS_MARKER = /\b(?:T&C|Terms\s*(?:&|and)\s*Conditions):?\s*/i;
const SEGMENT_MARKER = /^(reg|vip)$/i;
// Content-based detector (not tied to a specific bullet emoji — the theme
// emoji varies per campaign, e.g. "⚡" vs "🎨") for which body lines are
// deposit-tier lines at all, as opposed to other bulleted lines using the
// same emoji (e.g. a "🎨 Wagering: x35" line, which isn't a tier). Matches
// either phrasing order a tier line may use — "Deposit ... FS" (the
// original brief shape) or "... FS ... deposit" (some briefs state the spin
// count/wager/code first and name the qualifying deposit last, e.g. "30 FS
// (wager x35) with code VIP on a €30+ deposit.").
const TIER_LINE_PATTERN = /(?:Deposit\b.*?\bFS\b)|(?:\bFS\b.*?\bdeposit\b)/i;
// The "at <amount>" per-spin-value clause is optional — only MW's page
// rendering needs it, and it enforces its own presence for that reason.
// `(?:[A-Za-z-]+\s+)*` before "FS" tolerates a qualifier word between the
// spin count and "FS" (e.g. "25 High-Bet FS"), not just a bare "N FS".
const TIER_PATTERN =
  /Deposit\s*([€$£])?\s*([\d.,]+)\+?\s*(?:→|-|–|—)\s*(?:get\s*)?(\d+)\s*(?:[A-Za-z-]+\s+)*FS(?:\s*at\s*([€$£])?\s*([\d.,]+))?/i;
// Global variant for pulling every tier out of a brief that lists more than
// one deposit offer (e.g. a standard + a "High-Bet" tier) — `parseTier`/
// `TIER_PATTERN` alone only ever surface the first match in a blob of text.
const TIER_PATTERN_GLOBAL = new RegExp(TIER_PATTERN.source, 'gi');
// Reversed-order counterpart of TIER_PATTERN — spin count (plus whatever
// wager/code detail sits between) first, deposit amount named last (e.g.
// "30 FS (wager x35) with code VIP on a €30+ deposit."). No per-spin-value
// clause here — that "at <amount>" shape has only ever shown up attached to
// the forward "Deposit ... FS" phrasing.
const TIER_PATTERN_REVERSED =
  /(\d+)\s*(?:[A-Za-z-]+\s+)*FS\b.*?\bon\s+an?\s*([€$£])?\s*([\d.,]+)\+?\s*deposit\b/i;
const TIER_PATTERN_REVERSED_GLOBAL = new RegExp(
  TIER_PATTERN_REVERSED.source,
  'gi',
);
// Forward order (deposit clause first, like TIER_PATTERN) but with no fixed
// "→"/"-" separator at all between the amount and the spin count — some
// briefs instead run a whole clause in between (e.g. "Deposit €30+ with
// code VIP and claim 30 FS (wager x35)."). Tried only after the stricter
// TIER_PATTERN fails, since its unbounded middle is more prone to spanning
// unrelated numbers than a fixed separator would be.
const TIER_PATTERN_LOOSE =
  /Deposit\s*([€$£])?\s*([\d.,]+)\+?\b.*?\b(\d+)\s*(?:[A-Za-z-]+\s+)*FS\b/i;
const TIER_PATTERN_LOOSE_GLOBAL = new RegExp(TIER_PATTERN_LOOSE.source, 'gi');
const PLAY_PATTERN = /^Play\s+(.+?)\s+and\s+([^.]+)\.?\s*$/i;
// "code" itself is matched case-insensitively (briefs write "Code MONTH" at
// a sentence start as often as "use code MONTH" mid-sentence) — only the
// captured code value is required to be upper-case, same as before.
const CODE_PATTERN = /\b[Cc]ode\s+([A-Z][A-Z0-9]{1,})\b/;
// Recognized by keyword rather than a "•" prefix because — per both the MW
// and BH source texts — this specific boilerplate sentence always folds
// into the point above it instead of getting its own number.
const FORCED_CONTINUATION_LINES = [
  /^Any winnings above the applicable maximum win limit will be forfeited\.?$/i,
];
const NUMBERED_POINT_PATTERN = /^\d+\.\s+/;
const QUOTED_PROMO_NAME_PATTERN = /["“]([^"”]+)["”]\s+promotion/i;
// Some briefs bold the promo name instead of quoting it (e.g. "The <b>End
// of Season</b> promotion ...") — matched against the tag-still-present
// text, since `QUOTED_PROMO_NAME_PATTERN` runs against the tag-stripped
// version where the <b> markers are already gone.
const BOLD_PROMO_NAME_PATTERN = /\bThe\s+<b>([^<]+)<\/b>\s+promotion/i;
// Most briefs write "Wager(ing): xN", but some flip the order to "xN
// wager(ing)" instead (e.g. "x35 wager") — the multiplier lands in
// whichever capture group matched, group 1 for the first form, group 2 for
// the second.
const WAGER_MULTIPLIER_PATTERN =
  /(?:Wager(?:ing)?:?\s*[x×]\s*(\d+)|[x×]\s*(\d+)\s*wager(?:ing)?\b)/i;
const USE_CODE_LINE_PATTERN = /^Use\s+code\b/i;
const USE_CODE_ANYWHERE_PATTERN = /\bUse\s+code\b/i;
// Marks the boundary a brief's own heading typically ends on (e.g. "...
// Final Orbit 🚀") even when the rest of the paragraph runs on with no line
// break after it — used only as a fallback when there's no real newline to
// split the heading from the intro on.
const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;
// "The bonus includes N Free Spins on <Game> by <Studio>." — the only
// reliable place a featured game name shows up when there's no "Play X or
// Y and Z" closing line to pull it from instead.
const GAME_NAME_PATTERN = /\bon\s+([A-Z][A-Za-z0-9'’\s]*?)\s+by\s+[A-Z]/;

// A source doc sometimes runs "Header: X TEXT: Y Button: Z" together on one
// line with no real line break between the labels (e.g. copy-pasted from a
// two-column requirements table) — stop each capture at the next label,
// not just at the next newline, or "Header:" would swallow "TEXT:"/
// "Button:" whole.
const HEADER_LINE_PATTERN = /Header:\s*([^\n]+?)(?=\s*(?:TEXT:|Button:)|\n|$)/i;
const PRIZE_LINE_PATTERN = /TEXT:\s*([^\n]+?)(?=\s*(?:Header:|Button:)|\n|$)/i;
const BUTTON_LINE_PATTERN = /Button:\s*([^\n]+?)(?=\s*(?:Header:|TEXT:)|\n|$)/i;

export interface CompactCardFields {
  title: string;
  pool: string;
  code: string;
  // Kept as the raw matched text (e.g. "€30") rather than a normalized
  // MoneyAmount — the compact card's `details` blurb displays it verbatim,
  // it isn't looked up as a CMS money snippet the way rulesHtml amounts are.
  depositText: string;
  freeSpinsCount: number;
  wagerMultiplier: number;
  // Raw "Button: ..." text, unmodified (no title-casing) — absent if the
  // brief has no Button line. BH's compact card uses this verbatim rather
  // than through toTitleCase, since its target shape shows "GET BONUS" as
  // written rather than "Get Bonus".
  buttonText?: string;
}

export interface MwPageTier {
  depositText: string;
  freeSpinsCount: number;
}

export interface MwPageFields {
  title: string;
  prize: string;
  code: string;
  // One entry per "Deposit ..." tier the brief lists (e.g. a standard tier
  // plus a "High-Bet" tier) — unlike the compact card's single headline
  // tier, the full page renders every one of them.
  tiers: MwPageTier[];
  wagerMultiplier: number;
  // The bullet glyph the brief's own tier/wagering lines use (e.g. "🎨",
  // "🌐") — reproduced as-is in the tier block rather than a fixed "⚡",
  // since different campaigns brand their bullets differently.
  tierEmoji: string;
  heading: string;
  introText: string;
  actionText: string;
  gameLinks: GameLink[];
  termsPoints: string[];
}

/** Normalizes a "*" sub-bullet marker to the "•" the templates render with. */
function normalizeBulletMarker(line: string): string {
  return line.startsWith('*') ? `•${line.slice(1)}` : line;
}

/**
 * Some briefs bold individual values inline within a sentence (e.g. "with
 * code <b>VIP</b> on a <b>€30+ deposit</b>.") rather than a whole line —
 * the tag then sits directly between two tokens a structural pattern
 * expects to find adjacent (a number and its unit, "code" and the code
 * itself, ...). Used to check/extract structure only; the original,
 * tag-still-present text is what actually gets stored/rendered, so the
 * bold emphasis survives into the templates unchanged.
 */
function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

/** `TIER_LINE_PATTERN.test`, tolerant of inline bold tags splitting the line. */
function isTierLine(line: string): boolean {
  return TIER_LINE_PATTERN.test(stripTags(line));
}

/** A single deposit-tier match, normalized to the same field shape regardless
 * of whether it came from the forward "Deposit ... FS" phrasing or the
 * reversed "... FS ... deposit" one. */
interface TierMatch {
  depSymbol?: string;
  depAmount: string;
  fsCount: string;
  valSymbol?: string;
  valAmount?: string;
}

function normalizeForwardTier([
  ,
  depSymbol,
  depAmount,
  fsCount,
  valSymbol,
  valAmount,
]: RegExpMatchArray): TierMatch {
  return { depSymbol, depAmount, fsCount, valSymbol, valAmount };
}

function normalizeReversedTier([
  ,
  fsCount,
  depSymbol,
  depAmount,
]: RegExpMatchArray): TierMatch {
  return { depSymbol, depAmount, fsCount };
}

/** Tries the forward tier phrasing first, then the reversed one, then the
 * loose no-separator forward variant. Matches against a tag-stripped view
 * (see `stripTags`) so an inline "<b>" around e.g. the spin count or deposit
 * amount doesn't break the adjacency the patterns expect. */
function matchTier(text: string): TierMatch | null {
  const plain = stripTags(text);
  const forward = plain.match(TIER_PATTERN);
  if (forward) return normalizeForwardTier(forward);
  const reversed = plain.match(TIER_PATTERN_REVERSED);
  if (reversed) return normalizeReversedTier(reversed);
  // TIER_PATTERN_LOOSE shares TIER_PATTERN's group order (depSymbol,
  // depAmount, fsCount) with no trailing per-spin-value groups, so the same
  // normalizer applies — the missing groups just destructure to undefined.
  const loose = plain.match(TIER_PATTERN_LOOSE);
  return loose ? normalizeForwardTier(loose) : null;
}

/** Every tier in `text`, forward-phrased matches before reversed-phrased ones
 * (matching brief order isn't tracked — briefs have so far only ever used
 * one phrasing consistently throughout, never mixed them). The loose
 * variant is only consulted when neither strict pattern found anything
 * anywhere in the text — its unbounded middle is a superset of what
 * TIER_PATTERN itself matches, so running it unconditionally would
 * double-count every tier a properly-separated brief already gets right. */
function matchAllTiers(text: string): TierMatch[] {
  const plain = stripTags(text);
  const strict = [
    ...[...plain.matchAll(TIER_PATTERN_GLOBAL)].map(normalizeForwardTier),
    ...[...plain.matchAll(TIER_PATTERN_REVERSED_GLOBAL)].map(
      normalizeReversedTier,
    ),
  ];
  if (strict.length > 0) return strict;
  return [...plain.matchAll(TIER_PATTERN_LOOSE_GLOBAL)].map(
    normalizeForwardTier,
  );
}

const TRAILING_CLOSE_TAGS_PATTERN = /^(?:\s*<\/[a-zA-Z][a-zA-Z0-9]*>)+/;

/**
 * A caller may bold/emphasize a whole marker line of their own (e.g.
 * "<b>T&C:</b>"), which puts a stray closing tag right after where the
 * marker regex itself stops matching. Left in place, that leftover
 * `</b>` becomes the start of the extracted content — for T&C text
 * specifically, this reliably manifests as a bogus leading point that
 * shifts every real point number up by one. Skip past any such tags
 * immediately following `index` before slicing.
 */
function skipTrailingCloseTags(text: string, index: number): number {
  const match = text.slice(index).match(TRAILING_CLOSE_TAGS_PATTERN);
  return match ? index + match[0].length : index;
}

/**
 * Parses ONE segment's promo text (banner fields + promo-page copy + T&C)
 * — i.e. either the Regular/Pre-VIP or the VIP text block, never both at
 * once. Mirrors TournamentParserService: targeted regex extraction against
 * a recurring, semi-structured text shape rather than generic NLP.
 */
@Injectable()
export class PromoParserService {
  /**
   * `requireBodyStructure` gates the heading/tier-lines/closing-"Play X and
   * Y" checks — only MW's page template actually consumes those fields
   * (see brands/mw.template.ts); BH and SG render generically from
   * `termsPoints` alone, so their briefs don't need to follow that rigid
   * shape. Defaults to true (the original, strict behavior) so any caller
   * that doesn't know the target brand yet — e.g. the bare /parse preview
   * with no brand — still gets a clear error instead of silently blank
   * fields.
   */
  parse(
    rawText: string,
    options: { requireBodyStructure?: boolean } = {},
  ): ParsedPromo {
    const requireBodyStructure = options.requireBodyStructure ?? true;
    const text = rawText.replace(/\r\n/g, '\n');

    const { title, prize, buttonText } = this.parseBannerFields(text);

    const bodyText = this.extractSection(
      text,
      BODY_MARKER,
      TERMS_MARKER,
      'promo page body ("текст на промо сторінку")',
    );
    const termsText = this.extractAfter(text, TERMS_MARKER, 'T&C');

    const bodyLines = bodyText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (bodyLines.length === 0) this.fail('promo page body');

    const heading = bodyLines[0];

    const tierLineIdx = bodyLines.findIndex((line) => isTierLine(line));

    let introText = '';
    let tiers: DepositTier[] = [];
    let gameLinks: GameLink[] = [];
    let actionText = '';

    if (tierLineIdx === -1) {
      if (requireBodyStructure) {
        this.fail('deposit tiers ("Deposit ..." lines)');
      }
      introText = bodyLines.slice(1).join(' ').trim();
    } else {
      introText = bodyLines.slice(1, tierLineIdx).join(' ').trim();
      if (!introText && requireBodyStructure) this.fail('intro text');

      tiers = bodyLines
        .filter((line) => isTierLine(line))
        .map((line) => this.parseTier(line));

      const closingLineIdx = bodyLines.findIndex(
        (line, idx) => idx > tierLineIdx && !isTierLine(line),
      );
      const playLine =
        closingLineIdx === -1
          ? null
          : this.tryParsePlayLine(bodyLines[closingLineIdx]);

      if (playLine) {
        ({ gameLinks, actionText } = playLine);
      } else if (requireBodyStructure) {
        this.fail(
          closingLineIdx === -1
            ? 'closing "Play ..." line'
            : `"Play ..." line "${bodyLines[closingLineIdx]}"`,
        );
      }
    }

    // The intro sentence usually says "Use code XXX", but some segments
    // (e.g. a VIP variant with no deposit code prompt in the intro) only
    // mention the code inside the T&C — fall back to searching there.
    const codeMatch =
      stripTags(introText).match(CODE_PATTERN) ??
      stripTags(termsText).match(CODE_PATTERN);
    if (!codeMatch) this.fail('bonus code ("Use code XXX")');
    const code = codeMatch[1];

    const termsPoints = this.splitTermsPoints(termsText);
    if (termsPoints.length === 0) this.fail('T&C points');

    return {
      title,
      prize,
      buttonText,
      segment: this.extractSegment(text),
      code,
      heading,
      introText,
      bodyRawText: bodyText,
      tiers,
      actionText,
      gameLinks,
      termsPoints,
      termsRawText: termsText,
    };
  }

  /**
   * Parses a request that only sends the T&C block — no banner fields, no
   * promo-page body, no "⚡ Deposit ..." tiers — for brands whose rules
   * output is rendered generically from `termsPoints` (BH, SG) rather than
   * built from extracted deposit/wager/max-win facts. The other
   * `ParsedPromo` fields that only the full `parse()` path populates
   * (prize, heading, tiers, ...) are left blank/empty since nothing here
   * consumes them.
   */
  parseTermsOnly(rawText: string, titleOverride?: string): ParsedPromo {
    const text = rawText.replace(/\r\n/g, '\n');
    const marker = text.match(TERMS_MARKER);
    const termsText =
      marker && marker.index !== undefined
        ? text.slice(
            skipTrailingCloseTags(text, marker.index + marker[0].length),
          )
        : text;

    // Callers may have pre-marked emphasis with inline `<b>...</b>` tags of
    // their own (kept verbatim in the rendered points below) — match the
    // title/code against a tag-stripped view so a tag sitting between e.g.
    // the closing quote and "promotion" doesn't break the pattern.
    const plainTermsText = termsText.replace(/<[^>]+>/g, '');

    const title =
      titleOverride ??
      plainTermsText.match(QUOTED_PROMO_NAME_PATTERN)?.[1] ??
      termsText.match(BOLD_PROMO_NAME_PATTERN)?.[1];
    if (!title) {
      throw new BadRequestException(
        'Could not determine the promo title — pass `title` explicitly, or ' +
          "phrase the T&C's opening sentence as 'The \"Promo Name\" promotion ...'",
      );
    }

    const termsPoints = this.splitTermsPoints(termsText);
    if (termsPoints.length === 0) this.fail('T&C points');

    return {
      title,
      prize: '',
      code: plainTermsText.match(CODE_PATTERN)?.[1] ?? '',
      heading: '',
      introText: '',
      bodyRawText: '',
      tiers: [],
      actionText: '',
      gameLinks: [],
      termsPoints,
      termsRawText: termsText,
    };
  }

  /**
   * Parses just the fields a compact listing card needs (title, prize,
   * deposit tier, wagering multiplier, bonus code) — no T&C marker
   * required at all, unlike `parse()`/`parseTermsOnly()`, since this card
   * shape has no dateRange/condition/rules content that would need it.
   * Deliberately scans the whole text for each fact independently (not a
   * fixed banner→body→T&C sequence) so it tolerates campaigns that skip
   * the usual "Play X and Y" closing line or write their intro/tiers in
   * whatever order.
   */
  /** Just the title/prize (Header:/TEXT: lines, or the "надпис ..." plain-line
   * fallback) — no tier/wager/code required. */
  parseTitlePrize(rawText: string): { title: string; prize: string } {
    const text = rawText.replace(/\r\n/g, '\n');
    const { title, prize } = this.parseBannerFields(text);
    return { title, prize };
  }

  parseCompactCardFields(rawText: string): CompactCardFields {
    const text = rawText.replace(/\r\n/g, '\n');

    const { title, prize: pool, buttonText } = this.parseBannerFields(text);

    const tierMatch = matchTier(text);
    if (!tierMatch) this.fail('deposit tier ("Deposit ... FS" line)');

    const plainText = stripTags(text);
    const wagerMatch = plainText.match(WAGER_MULTIPLIER_PATTERN);
    if (!wagerMatch) this.fail('wagering multiplier ("Wager(ing): xN")');

    const codeMatch = plainText.match(CODE_PATTERN);
    if (!codeMatch) this.fail('bonus code ("Use code XXX")');

    return {
      title,
      pool,
      code: codeMatch[1],
      depositText: `${tierMatch.depSymbol ?? '€'}${tierMatch.depAmount}`,
      freeSpinsCount: Number(tierMatch.fsCount),
      wagerMultiplier: Number(wagerMatch[1] ?? wagerMatch[2]),
      buttonText,
    };
  }

  /**
   * Parses a full MW promo page's worth of fields from a brief that
   * doesn't follow MW's original rigid shape (no "Play X or Y and Z"
   * closing line, no per-spin "at <value>" tier clause) — reuses
   * `parseCompactCardFields` for the money/FS/wager/code facts, then adds
   * what the page template also needs: heading, intro/action text taken
   * verbatim from the brief's own wording, the tier block's bullet glyph,
   * and a featured game name pulled from the T&C's "... on <Game> by
   * <Studio>." sentence (the only reliable source when there's no "Play"
   * line to get it from).
   */
  parseMwPageFields(rawText: string): MwPageFields {
    const text = rawText.replace(/\r\n/g, '\n');
    const compact = this.parseCompactCardFields(text);

    const bodyText = this.extractSection(
      text,
      BODY_MARKER,
      TERMS_MARKER,
      'promo page body ("текст на промо сторінку")',
    );
    const bodyLines = bodyText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (bodyLines.length === 0) this.fail('promo page body');

    let heading: string;
    let introText: string;
    let actionText: string;
    let tierEmoji: string;

    if (bodyLines.length === 1) {
      // No line breaks at all in the body — a brief pasted from a chat/doc
      // often collapses this way. Fall back to marker-based splitting
      // instead of position-based splitting.
      ({ heading, introText, actionText, tierEmoji } = this.splitRunOnBody(
        bodyLines[0],
      ));
    } else {
      const tierLineIdx = bodyLines.findIndex((line) => isTierLine(line));
      if (tierLineIdx === -1) this.fail('deposit tier ("Deposit ... FS" line)');
      heading = bodyLines[0];

      // Forward phrasing puts the emoji right before "Deposit"; reversed
      // phrasing (e.g. "🚀 30 FS ... deposit.") puts it before the spin
      // count instead — try both before falling back to the default glyph.
      // Matched against a tag-stripped view so an inline "<b>" between the
      // emoji and "Deposit"/the spin count doesn't hide the emoji.
      const plainTierLine = stripTags(bodyLines[tierLineIdx]);
      const tierEmojiMatch =
        plainTierLine.match(/^(\S+)\s*Deposit/i) ??
        plainTierLine.match(
          new RegExp(
            `^(${EMOJI_PATTERN.source})\\s*\\d+\\s*(?:[A-Za-z-]+\\s+)*FS\\b`,
            'iu',
          ),
        );
      tierEmoji = tierEmojiMatch ? tierEmojiMatch[1] : '⚡';

      // Intro runs from just after the heading up to (not including) either
      // the tier line or a "Use code ..." line, whichever comes first — the
      // brief states the code as its own standalone line right before the
      // tiers, not as part of the intro sentence.
      let introEndIdx = tierLineIdx;
      for (let i = 1; i < tierLineIdx; i++) {
        if (USE_CODE_LINE_PATTERN.test(stripTags(bodyLines[i]))) {
          introEndIdx = i;
          break;
        }
      }
      introText = bodyLines.slice(1, introEndIdx).join(' ').trim();

      // Action text is the first line after the tier block that isn't itself
      // a tier line, a wagering-multiplier line, or the "Use code ..." line.
      const actionLineIdx = bodyLines.findIndex((line, idx) => {
        if (idx <= tierLineIdx) return false;
        const plainLine = stripTags(line);
        return (
          !isTierLine(line) &&
          !WAGER_MULTIPLIER_PATTERN.test(plainLine) &&
          !USE_CODE_LINE_PATTERN.test(plainLine)
        );
      });
      actionText =
        actionLineIdx === -1
          ? ''
          : bodyLines.slice(actionLineIdx).join(' ').trim();
    }

    const termsText = this.extractAfter(text, TERMS_MARKER, 'T&C');
    const termsPoints = this.splitTermsPoints(termsText);
    if (termsPoints.length === 0) this.fail('T&C points');

    const gameMatch = stripTags(termsText).match(GAME_NAME_PATTERN);
    const gameLinks: GameLink[] = gameMatch
      ? [{ name: gameMatch[1].trim(), slug: slugify(gameMatch[1].trim()) }]
      : [];

    // `compact.depositText`/`compact.freeSpinsCount` only ever reflect the
    // first tier in the text — re-scan for every "Deposit ... FS" match so a
    // brief with more than one tier (e.g. a standard + a "High-Bet" tier)
    // renders all of them, not just the first.
    const tiers: MwPageTier[] = matchAllTiers(text).map((t) => ({
      depositText: `${t.depSymbol ?? '€'}${t.depAmount}`,
      freeSpinsCount: Number(t.fsCount),
    }));

    return {
      title: compact.title,
      prize: compact.pool,
      code: compact.code,
      tiers,
      wagerMultiplier: compact.wagerMultiplier,
      tierEmoji,
      heading,
      introText,
      actionText,
      gameLinks,
      termsPoints,
    };
  }

  /**
   * Marker-based fallback for `parseMwPageFields` when the promo body has no
   * line breaks at all between its heading, intro, tier bullets, and closing
   * sentence — used only when `bodyLines.length === 1`, so a properly
   * line-broken brief never takes this path. Heading is assumed to end at
   * the first emoji before "Use code" (both real examples seen so far end
   * their title with a theme emoji before the intro prose continues); the
   * action text is whatever trails after the last tier/wager match, since
   * there's no line break there to split on either. Falls back to treating
   * the whole paragraph as the heading — the old, safe-but-degraded
   * behavior — if there's no "Use code" marker at all to anchor on.
   */
  private splitRunOnBody(line: string): {
    heading: string;
    introText: string;
    actionText: string;
    tierEmoji: string;
  } {
    const useCodeMatch = line.match(USE_CODE_ANYWHERE_PATTERN);
    if (!useCodeMatch || useCodeMatch.index === undefined) {
      return { heading: line, introText: '', actionText: '', tierEmoji: '⚡' };
    }

    const preUseCode = line.slice(0, useCodeMatch.index).trim();
    const emojiMatch = preUseCode.match(EMOJI_PATTERN);
    const splitAt =
      emojiMatch && emojiMatch.index !== undefined
        ? emojiMatch.index + emojiMatch[0].length
        : undefined;
    const heading =
      splitAt === undefined ? preUseCode : preUseCode.slice(0, splitAt).trim();
    const introText =
      splitAt === undefined ? '' : preUseCode.slice(splitAt).trim();

    const tail = line.slice(useCodeMatch.index);
    const tierEmojiMatch =
      tail.match(new RegExp(`(${EMOJI_PATTERN.source})\\s*Deposit`, 'u')) ??
      tail.match(
        new RegExp(
          `(${EMOJI_PATTERN.source})\\s*\\d+\\s*(?:[A-Za-z-]+\\s+)*FS\\b`,
          'iu',
        ),
      );
    const tierEmoji = tierEmojiMatch ? tierEmojiMatch[1] : '⚡';

    const tierMatchEnds = [
      ...[...tail.matchAll(TIER_PATTERN_GLOBAL)].map(
        (m) => (m.index ?? 0) + m[0].length,
      ),
      ...[...tail.matchAll(TIER_PATTERN_REVERSED_GLOBAL)].map(
        (m) => (m.index ?? 0) + m[0].length,
      ),
    ];
    const wagerMatch = tail.match(WAGER_MULTIPLIER_PATTERN);
    const wagerMatchEnd =
      wagerMatch && wagerMatch.index !== undefined
        ? wagerMatch.index + wagerMatch[0].length
        : 0;
    const lastEnd = Math.max(0, wagerMatchEnd, ...tierMatchEnds);
    const actionText = tail.slice(lastEnd).trim();

    return { heading, introText, actionText, tierEmoji };
  }

  /**
   * Title/prize/button, tried as the labeled "Header:"/"TEXT:"/"Button:"
   * lines first, falling back to the unlabeled "надпис на промо сторінку"
   * block (one plain line each: title, then prize, then optionally button)
   * only when the labeled form isn't present at all — a brief that has the
   * labels keeps taking the original, more specific path unchanged.
   */
  private parseBannerFields(text: string): {
    title: string;
    prize: string;
    buttonText?: string;
  } {
    const title = this.extractLine(text, HEADER_LINE_PATTERN, 'header', false);
    const prize = this.extractLine(
      text,
      PRIZE_LINE_PATTERN,
      'prize text',
      false,
    );
    if (title && prize) {
      return {
        title,
        prize,
        buttonText: this.extractLine(
          text,
          BUTTON_LINE_PATTERN,
          'button text',
          false,
        ),
      };
    }

    const bannerLines = this.extractBannerLines(text);
    if (bannerLines && bannerLines.length >= 2) {
      return {
        title: bannerLines[0],
        prize: bannerLines[1],
        buttonText: bannerLines[2],
      };
    }

    this.fail('header');
  }

  /**
   * Plain, unlabeled lines making up the "надпис на промо сторінку" banner
   * block, scoped the same way as BODY_MARKER's own section (from the
   * marker up to the next promo-page-body marker, or end of text if that
   * marker isn't found yet at this point). Returns undefined if the marker
   * itself isn't present — the caller treats that as "this brief uses the
   * labeled form instead", not as an error.
   */
  private extractBannerLines(text: string): string[] | undefined {
    const bannerMatch = text.match(BANNER_MARKER);
    if (!bannerMatch || bannerMatch.index === undefined) return undefined;
    const afterBanner = text.slice(
      skipTrailingCloseTags(text, bannerMatch.index + bannerMatch[0].length),
    );
    const bodyMatch = afterBanner.match(BODY_MARKER);
    const section =
      bodyMatch && bodyMatch.index !== undefined
        ? afterBanner.slice(0, bodyMatch.index)
        : afterBanner;
    const lines = section
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.length > 0 ? lines : undefined;
  }

  private fail(field: string): never {
    throw new BadRequestException(`Could not parse "${field}" from promo text`);
  }

  /**
   * Some briefs carry a leftover/duplicate "Header: ... TEXT: ... Button:
   * ..." block before the real one (e.g. a stray "slider" section pasted
   * ahead of the actual banner text) — search only up to the promo-page
   * body marker (the real fields always sit immediately before it) and
   * take the LAST match in that scope, not the first. When there's only
   * one occurrence (the common case), first-match and last-match are
   * identical, so this doesn't change behavior for already-working input.
   */
  private extractLine(
    text: string,
    pattern: RegExp,
    field: string,
    required = true,
  ): string | undefined {
    const bodyMatch = text.match(BODY_MARKER);
    const scope =
      bodyMatch && bodyMatch.index !== undefined
        ? text.slice(0, bodyMatch.index)
        : text;
    const globalPattern = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
    );
    let match: RegExpExecArray | null;
    let last: RegExpExecArray | null = null;
    while ((match = globalPattern.exec(scope))) {
      last = match;
      if (match[0].length === 0) globalPattern.lastIndex++;
    }
    if (!last) {
      if (required) this.fail(field);
      return undefined;
    }
    return last[1].replace(TRAILING_CLOSE_TAGS_PATTERN, '').trim();
  }

  private extractSection(
    text: string,
    start: RegExp,
    end: RegExp,
    field: string,
  ): string {
    const startMatch = text.match(start);
    if (!startMatch || startMatch.index === undefined) this.fail(field);
    const afterStart = text.slice(
      skipTrailingCloseTags(text, startMatch.index + startMatch[0].length),
    );
    const endMatch = afterStart.match(end);
    return endMatch && endMatch.index !== undefined
      ? afterStart.slice(0, endMatch.index)
      : afterStart;
  }

  private extractAfter(text: string, start: RegExp, field: string): string {
    const startMatch = text.match(start);
    if (!startMatch || startMatch.index === undefined) this.fail(field);
    return text.slice(
      skipTrailingCloseTags(text, startMatch.index + startMatch[0].length),
    );
  }

  private parseTier(line: string): DepositTier {
    const match = matchTier(line);
    if (!match) this.fail(`deposit tier line "${line}"`);
    const tier: DepositTier = {
      depositMin: {
        amount: parseAmount(match.depAmount),
        currency: normalizeCurrency(match.depSymbol ?? '€'),
      },
      freeSpinsCount: Number(match.fsCount),
    };
    if (match.valAmount) {
      tier.freeSpinValue = {
        amount: parseAmount(match.valAmount),
        currency: normalizeCurrency(match.valSymbol ?? '€'),
      };
    }
    return tier;
  }

  private tryParsePlayLine(
    line: string,
  ): { gameLinks: GameLink[]; actionText: string } | null {
    const match = line.match(PLAY_PATTERN);
    if (!match) return null;
    const [, gamesPart, actionText] = match;
    const gameLinks = gamesPart
      .split(/\s+or\s+/i)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name, slug: slugify(name) }));
    return { gameLinks, actionText: actionText.trim() };
  }

  /**
   * A standalone "Reg" or "VIP" line at the top of the segment text (as
   * pasted from the requirements doc, before "Header:") — used as the
   * default segment when the caller doesn't pass one explicitly.
   */
  private extractSegment(text: string): 'regular' | 'vip' | undefined {
    const firstLine = text
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (!firstLine) return undefined;
    const match = firstLine.match(SEGMENT_MARKER);
    if (!match) return undefined;
    return match[1].toLowerCase() === 'vip' ? 'vip' : 'regular';
  }

  /**
   * If the source already numbers its own points ("1. ...", "2. ...", at
   * least two of them), that numbering is the authoritative point
   * boundary: every other line — "•"/"*" sub-bullets, and any unmarked
   * trailing sentence — folds into the point above it, and the leading
   * "N. " is stripped so the brand renderer's own numbering doesn't double
   * up with the source's. Otherwise (no source numbering) one line = one
   * point, with "•"/"*" lines and FORCED_CONTINUATION_LINES folding in as
   * before — the source T&C text has no blank-line paragraph breaks, so
   * that's the only mechanical signal available in that case, and
   * occasional runs of prose a human editor would fold into the previous
   * point may come out as their own point instead. Review via `/parse`
   * before calling `/generate` if the numbering needs a manual nudge.
   */
  private splitTermsPoints(raw: string): string[] {
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const isExplicitlyNumbered =
      lines.filter((line) => NUMBERED_POINT_PATTERN.test(line)).length >= 2;

    const points: string[] = [];
    for (const line of lines) {
      if (isExplicitlyNumbered) {
        if (NUMBERED_POINT_PATTERN.test(line) || points.length === 0) {
          points.push(line.replace(NUMBERED_POINT_PATTERN, ''));
        } else {
          points[points.length - 1] += `\n${normalizeBulletMarker(line)}`;
        }
        continue;
      }

      const isContinuation =
        line.startsWith('•') ||
        line.startsWith('*') ||
        FORCED_CONTINUATION_LINES.some((pattern) => pattern.test(line));
      if (isContinuation && points.length > 0) {
        points[points.length - 1] += `\n${normalizeBulletMarker(line)}`;
      } else {
        points.push(line);
      }
    }
    return points;
  }
}
