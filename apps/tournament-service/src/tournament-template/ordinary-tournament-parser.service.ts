import { BadRequestException, Injectable } from '@nestjs/common';
import { ParsedOrdinaryTournament } from './dto/parsed-ordinary-tournament.dto';
import { parseAmount } from './tournament-parser.util';

const TERMS_MARKER_LINE = /^T&C:?$/i;
const BOLD_TAG = /<\/?b>/gi;
const POOL_PATTERN = /(\d[\d.,]*)\s*(?:Free\s*Spins|FS)\b/i;
const DATE_RANGE_PATTERN =
  /runs from\s+([A-Za-z]+)\s+\d{1,2},?\s+(\d{4})\s*,?\s*to\s+[A-Za-z]+\s+\d{1,2},?\s+\d{4}/i;
// Some briefs quote the tournament's own name in its T&C validity sentence
// (e.g. `The "Brewmaster Exhibition" runs from ...`) — a more reliable name
// source than the header's first line when that line is itself just a
// section label (e.g. "TOURNAMENT – Brewmaster Exhibition") rather than the
// bare name Boho's briefs use there.
const QUOTED_NAME_PATTERN = /["“]([^"”]+)["”]\s+runs\s+from/i;
// A leading "1. "/"12. " point number, redundant once rendered into an
// <li> — Boho's briefs don't number their T&C lines at all, so this is a
// no-op for them and only strips anything on briefs that do.
const LEADING_POINT_NUMBER = /^\d+\.\s*/;

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

export interface OrdinaryTournamentOverrides {
  bgImageSrc: string;
  bgImageSrcMob?: string;
  frontendIdentifier?: string;
  disallowedForGroups?: string[];
}

@Injectable()
export class OrdinaryTournamentParserService {
  parse(
    rawText: string,
    overrides: OrdinaryTournamentOverrides,
  ): ParsedOrdinaryTournament {
    const text = rawText.replace(/\r\n/g, '\n').trim();

    // Structural markers (the name line, the "T&C:" line, the "runs from ..."
    // date sentence) are matched against a bold-stripped copy, since the brief
    // may wrap any of them in <b> for emphasis — but the description/terms
    // *content* keeps its original <b> markup verbatim, so it renders bold.
    const lines = text.split('\n');
    const strippedLines = lines.map((line) => this.stripBold(line).trim());

    const termsIdx = strippedLines.findIndex((line) =>
      TERMS_MARKER_LINE.test(line),
    );
    if (termsIdx === -1) this.fail('a "T&C:" section');

    const headerLines = lines
      .slice(0, termsIdx)
      .map((line) => line.trim())
      .filter(Boolean);
    const [rawName, ...restOfHeader] = headerLines;
    if (!rawName) this.fail('tournament name');

    const termsParagraphs = lines
      .slice(termsIdx + 1)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(LEADING_POINT_NUMBER, ''));
    if (termsParagraphs.length === 0) this.fail('terms and conditions');

    // The header's first line names the tournament directly in Boho's
    // briefs (used as-is, title-cased) — always excluded from the
    // description either way. Some briefs instead lead with a section label
    // ("TOURNAMENT – Brewmaster Exhibition") and state the real name in the
    // T&C's own validity sentence instead; that quoted name is preferred
    // whenever it's present since it's unambiguous, rather than relying on
    // the label line's own (inconsistent) casing/wording.
    const quotedName = termsParagraphs
      .join(' ')
      .match(QUOTED_NAME_PATTERN)?.[1];
    const name = quotedName ?? this.titleCase(this.stripBold(rawName));
    const descriptionParagraphs = restOfHeader;
    if (descriptionParagraphs.length === 0) this.fail('tournament description');

    const strippedHeader = strippedLines.slice(0, termsIdx).join('\n');
    const poolMatch = strippedHeader.match(POOL_PATTERN);
    if (!poolMatch) this.fail('prize pool');

    return {
      name,
      frontendIdentifier:
        overrides.frontendIdentifier ??
        this.deriveFrontendIdentifier(strippedLines.join('\n')),
      bgImageSrc: overrides.bgImageSrc,
      bgImageSrcMob: overrides.bgImageSrcMob,
      poolAmount: parseAmount(poolMatch[1]),
      poolUnit: 'FS',
      descriptionParagraphs,
      termsParagraphs,
      disallowedForGroups: overrides.disallowedForGroups ?? [],
    };
  }

  private fail(field: string): never {
    throw new BadRequestException(
      `Could not parse ${field} from tournament text`,
    );
  }

  private stripBold(line: string): string {
    return line.replace(BOLD_TAG, '');
  }

  private titleCase(raw: string): string {
    return raw.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private deriveFrontendIdentifier(text: string): string {
    const match = text.match(DATE_RANGE_PATTERN);
    if (!match) {
      throw new BadRequestException(
        'Could not derive "frontendIdentifier" from tournament text — pass it explicitly',
      );
    }
    const [, monthName, year] = match;
    const month = monthName.toLowerCase();
    if (!MONTH_NAMES.includes(month)) {
      throw new BadRequestException(
        `Unrecognized month "${monthName}" in tournament text`,
      );
    }
    return `tournament_${month}${year}`;
  }
}
