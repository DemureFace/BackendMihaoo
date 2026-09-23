import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BODY_STRUCTURE_REQUIRED_BRANDS,
  BRAND_TEMPLATE_RENDERERS,
  COMPACT_CARD_RENDERERS,
  DIRECT_CARD_RENDERERS,
  RULES_ONLY_RENDERERS,
} from './brands';
import { PromoBrand } from './brands/promo-brand.type';
import {
  CompactCardOptions,
  PromoSegmentOptions,
} from './brands/render-options.type';
import { BonusPageFields, buildBonusPage } from './bonus-page.util';
import { ParsedPromo } from './dto/parsed-promo.dto';
import { buildMwFlexiblePageTemplate } from './brands/mw.template';
import { buildIpContentSnippet, containsEuroAmount } from './ip-content.util';
import { buildSnippetOverrideMap } from './money-snippet.util';
import { PromoParserService } from './promo-parser.service';
import { slugify } from './slug.util';

@Injectable()
export class BonusTemplateService {
  constructor(private readonly parser: PromoParserService) {}

  parseText(text: string, brand?: PromoBrand): ParsedPromo {
    return this.parser.parse(text, {
      // No brand yet (bare /parse preview) → stay strict, same as before.
      requireBodyStructure: brand
        ? BODY_STRUCTURE_REQUIRED_BRANDS.has(brand)
        : true,
    });
  }

  render(
    parsed: ParsedPromo,
    brand: PromoBrand,
    imageUrl: string,
    moneySnippetOverrides?: Record<string, string>,
    options: PromoSegmentOptions = {},
  ) {
    const renderer = BRAND_TEMPLATE_RENDERERS[brand];
    if (!renderer) {
      throw new BadRequestException(
        `No promo-page template for brand "${brand}" yet`,
      );
    }
    const overrides = buildSnippetOverrideMap(moneySnippetOverrides);
    return {
      slug: slugify(parsed.title),
      ...renderer(parsed, imageUrl, overrides, options),
    };
  }

  generate(
    text: string,
    brand: PromoBrand,
    imageUrl: string,
    moneySnippetOverrides?: Record<string, string>,
    options: PromoSegmentOptions = {},
  ) {
    const parsed = this.parseText(text, brand);
    return {
      parsed,
      ...this.render(parsed, brand, imageUrl, moneySnippetOverrides, options),
    };
  }

  generateTermsRules(
    text: string,
    brand: PromoBrand,
    title?: string,
    moneySnippetOverrides?: Record<string, string>,
  ): string {
    const renderer = RULES_ONLY_RENDERERS[brand];
    if (!renderer) {
      throw new BadRequestException(
        `No terms-only rules template for brand "${brand}" yet`,
      );
    }
    const parsed = this.parser.parseTermsOnly(text, title);
    const overrides = buildSnippetOverrideMap(moneySnippetOverrides);
    return renderer(parsed, overrides);
  }

  generateCompactCard(
    text: string | undefined,
    brand: PromoBrand,
    options: CompactCardOptions,
    // 'lobby' (default) picks DIRECT_CARD_RENDERERS (MW's caller-supplied
    // lobby tile) when available; 'details' skips straight to
    // COMPACT_CARD_RENDERERS (MW's BH-shaped details card) instead — the
    // only brand with two shapes today is MW, which is in both maps.
    cardStyle: 'lobby' | 'details' = 'lobby',
  ): Record<string, unknown> {
    const directBuilder =
      cardStyle === 'lobby' ? DIRECT_CARD_RENDERERS[brand] : undefined;
    if (directBuilder) {
      // title/prize can come from a promo text's Header:/TEXT: lines, same
      // as BH/SG — explicit options.title/prize (if given) still win, so a
      // caller with no promo text at all (e.g. a lobby tile with nothing
      // to parse) keeps working exactly as before.
      const derived = text ? this.parser.parseTitlePrize(text) : undefined;
      return directBuilder({
        ...options,
        title: options.title ?? derived?.title,
        prize: options.prize ?? derived?.prize,
      });
    }

    const builder = COMPACT_CARD_RENDERERS[brand];
    if (!builder) {
      throw new BadRequestException(
        `No compact card template for brand "${brand}" yet`,
      );
    }
    if (!text) {
      throw new BadRequestException(
        `"text" is required for brand "${brand}"'s compact card`,
      );
    }
    const fields = this.parser.parseCompactCardFields(text);
    return builder(fields, options);
  }

  generateMwPage(
    text: string,
    imageUrl: string,
    moneySnippetOverrides?: Record<string, string>,
  ): string {
    const fields = this.parser.parseMwPageFields(text);
    const overrides = buildSnippetOverrideMap(moneySnippetOverrides);
    return buildMwFlexiblePageTemplate(fields, imageUrl, overrides);
  }

  /**
   * The "if there's a € sign, blank the field and emit a content-by-ip
   * snippet instead" rule — applied to a single card field at a time (e.g.
   * a card's `prize`/`pool` or `description`/`details`). Returns the value
   * to actually put in that field (unchanged if no € found, else '') plus
   * the accompanying snippet to place alongside it (null if not needed).
   */
  generateIpContent(text: string): { value: string; snippet: string | null } {
    if (!containsEuroAmount(text)) {
      return { value: text, snippet: null };
    }
    return { value: '', snippet: buildIpContentSnippet(text) };
  }

  generateBonusPage(fields: BonusPageFields): string {
    return buildBonusPage(fields);
  }
}
