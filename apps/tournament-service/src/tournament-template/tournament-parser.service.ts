import { BadRequestException, Injectable } from '@nestjs/common';
import {
  HotPeriod,
  MoneyAmount,
  ParsedTournament,
} from './dto/parsed-tournament.dto';
import {
  normalizeCurrency,
  parseAmount,
  zonedTimeToUtcIso,
} from './tournament-parser.util';

const IMAGE_PATTERN = /(\/\S+\.(?:webp|png|jpe?g|svg))/i;

export interface TournamentImageUrls {
  desktop: string;
  mobile?: string;
}

@Injectable()
export class TournamentParserService {
  parse(rawText: string, images: TournamentImageUrls): ParsedTournament {
    const text = rawText.replace(/\r\n/g, '\n');

    return {
      name: this.extractName(text),
      provider: this.extractProvider(text),
      startDate: this.extractDate(
        text,
        /Start date:[ \t]*([\d.]+)[ \t]+([\d:]+)(?:[ \t]+([A-Za-z]+))?/i,
        'start date',
      ),
      endDate: this.extractDate(
        text,
        /End date:[ \t]*([\d.]+)[ \t]+([\d:]+)(?:[ \t]+([A-Za-z]+))?/i,
        'end date',
      ),
      prizePool: this.extractMoney(
        text,
        /Prize pool:\s*([\d.,\s]+)\s*(EUR|USD|GBP|€|\$|£)/i,
        'prize pool',
      ),
      minBet: this.extractOptionalMoney(
        text,
        /Minimum [Bb]et is\s*([\d.,\s]+)\s*(EUR|USD|GBP|€|\$|£)/i,
      ),
      maxPrizesPerPlayer: this.extractMaxPrizes(text),
      gameCategoryId: this.extractDefaultCollection(text),
      brandGameCategoryOverrides: this.extractCollectionOverrides(text),
      restrictedCountries: this.extractRestrictedCountries(text),
      imageUrlDesktop: images.desktop,
      imageUrlMobile: images.mobile ?? images.desktop,
      hotPeriod: this.extractHotPeriod(text),
      cashCreditHours: this.extractCreditHours(text),
      rulesParagraphs: this.extractRulesParagraphs(text),
    };
  }

  private fail(field: string): never {
    throw new BadRequestException(
      `Could not parse "${field}" from tournament text`,
    );
  }

  private extractName(text: string): string {
    const match = text.match(/[“"]([^”"]+)[”"]/u) ?? text.match(/'([^']+)'/u);
    return match?.[1]?.trim() ?? this.fail('name');
  }

  private extractProvider(text: string): string {
    const match = text.match(/(?:від провайдера|provider)[:\s]+([^\n]+)/iu);
    return match?.[1]?.trim() ?? this.fail('provider');
  }

  private extractDate(text: string, pattern: RegExp, field: string): string {
    const match = text.match(pattern);
    if (!match) this.fail(field);
    const [, date, time, tz] = match;
    return zonedTimeToUtcIso(date, time, tz ?? 'UTC');
  }

  private extractMoney(
    text: string,
    pattern: RegExp,
    field: string,
  ): MoneyAmount {
    const match = text.match(pattern);
    if (!match) this.fail(field);
    return {
      amount: parseAmount(match[1]),
      currency: normalizeCurrency(match[2]),
    };
  }

  private extractOptionalMoney(
    text: string,
    pattern: RegExp,
  ): MoneyAmount | undefined {
    const match = text.match(pattern);
    if (!match) return undefined;
    return {
      amount: parseAmount(match[1]),
      currency: normalizeCurrency(match[2]),
    };
  }

  private extractMaxPrizes(text: string): number | undefined {
    const match = text.match(/maximum of\s*(\d+)\s*prizes/i);
    return match ? Number(match[1]) : undefined;
  }

  private extractDefaultCollection(text: string): string {
    const match = text.match(/Game Categories id:\s*([^\n]+)/i);
    if (!match) this.fail('game category id');
    return match[1].trim();
  }

  private extractCollectionOverrides(text: string): Record<string, string> {
    const blockMatch = text.match(
      /Game Categories id:[^\n]*\n((?:.*\n?)*?)(?:\n\s*\n|Restricted Countries)/i,
    );
    const block = blockMatch?.[1] ?? '';
    const overrides: Record<string, string> = {};
    const lineRegex = /(?:Для|For)\s+([A-Za-z/]+)\s*-\s*(\S+)/giu;
    let match: RegExpExecArray | null;
    while ((match = lineRegex.exec(block))) {
      const brands = match[1]
        .split('/')
        .map((brand) => brand.trim().toUpperCase());
      const overrideId = match[2].trim();
      for (const brand of brands) {
        overrides[brand] = overrideId;
      }
    }
    return overrides;
  }

  private extractRestrictedCountries(text: string): string[] {
    const match = text.match(
      /Restricted Countries:\s*\n?([\s\S]*?)(?:\n\s*\n)/i,
    );
    const block = match?.[1] ?? '';
    // No quoted codes means no restriction — covers an explicit "none" as
    // well as the whole section being omitted from the brief.
    return [...block.matchAll(/"([a-z]{2,3})"/gi)].map((m) =>
      m[1].toUpperCase(),
    );
  }

  private extractHotPeriod(text: string): HotPeriod | undefined {
    const match = text.match(
      /starts from\s*([\d.]+)\s*at\s*([\d:]+)\s*([A-Za-z]+)/i,
    );
    if (!match) return undefined;
    const [, date, time, timeZone] = match;
    return { date, time, timeZone: timeZone.toUpperCase() };
  }

  private extractCreditHours(text: string): number | undefined {
    const match = text.match(/within\s*(\d+)\s*hours/i);
    return match ? Number(match[1]) : undefined;
  }

  private extractRulesParagraphs(text: string): string[] {
    const startIdx = text.search(/TOURNAMENT RULES/i);
    if (startIdx === -1) this.fail('tournament rules section');

    let rulesText = text.slice(startIdx + 'TOURNAMENT RULES'.length);
    const imageIdx = rulesText.search(IMAGE_PATTERN);
    if (imageIdx !== -1) {
      rulesText = rulesText.slice(0, imageIdx);
    }

    return rulesText
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }
}
