import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BRAND_TEMPLATE_RENDERERS,
  LOCALE_TEMPLATE_RENDERERS,
  ORDINARY_BRAND_TEMPLATE_RENDERERS,
  ORDINARY_CARD_BUILDERS,
  OrdinaryTournamentBrand,
  TournamentBrand,
} from './brands';
import { renderLocalesAsText } from './brands/render-locales-text.util';
import { ParsedTournament } from './dto/parsed-tournament.dto';
import {
  OrdinaryTournamentOverrides,
  OrdinaryTournamentParserService,
} from './ordinary-tournament-parser.service';
import { renderSnippetsAsText } from './snippets/render-snippets-text.util';
import { SNIPPET_BUILDERS } from './snippets';
import { slugify } from './slug.util';
import {
  TournamentImageUrls,
  TournamentParserService,
} from './tournament-parser.service';

@Injectable()
export class TournamentTemplateService {
  constructor(
    private readonly parser: TournamentParserService,
    private readonly ordinaryParser: OrdinaryTournamentParserService,
  ) {}

  parseText(text: string, images: TournamentImageUrls): ParsedTournament {
    return this.parser.parse(text, images);
  }

  render(parsed: ParsedTournament, brand: TournamentBrand) {
    return {
      slug: slugify(parsed.name),
      template: BRAND_TEMPLATE_RENDERERS[brand](parsed),
    };
  }

  generate(text: string, brand: TournamentBrand, images: TournamentImageUrls) {
    const parsed = this.parseText(text, images);
    return { parsed, ...this.render(parsed, brand) };
  }

  generateSnippet(
    text: string,
    brand: TournamentBrand,
    images: TournamentImageUrls,
  ) {
    const builder = SNIPPET_BUILDERS[brand];
    if (!builder) {
      throw new BadRequestException(`No snippet template for brand "${brand}"`);
    }
    return builder(this.parseText(text, images));
  }

  generateSnippetText(
    text: string,
    brand: TournamentBrand,
    images: TournamentImageUrls,
  ): string {
    return renderSnippetsAsText(this.generateSnippet(text, brand, images));
  }

  generateLocales(
    text: string,
    brand: TournamentBrand,
    images: TournamentImageUrls,
  ) {
    const builder = LOCALE_TEMPLATE_RENDERERS[brand];
    if (!builder) {
      throw new BadRequestException(
        `No locale-variant template for brand "${brand}"`,
      );
    }
    const parsed = this.parseText(text, images);
    return { parsed, slug: slugify(parsed.name), templates: builder(parsed) };
  }

  generateLocalesText(
    text: string,
    brand: TournamentBrand,
    images: TournamentImageUrls,
  ): string {
    return renderLocalesAsText(
      this.generateLocales(text, brand, images).templates,
    );
  }

  generateOrdinary(
    text: string,
    brand: OrdinaryTournamentBrand,
    overrides: OrdinaryTournamentOverrides,
  ) {
    const parsed = this.ordinaryParser.parse(text, overrides);
    const cardBuilder = ORDINARY_CARD_BUILDERS[brand];
    return {
      parsed,
      slug: slugify(parsed.name),
      template: ORDINARY_BRAND_TEMPLATE_RENDERERS[brand](parsed),
      ...(cardBuilder ? { card: cardBuilder(parsed) } : {}),
    };
  }

  generateOrdinaryText(
    text: string,
    brand: OrdinaryTournamentBrand,
    overrides: OrdinaryTournamentOverrides,
  ): string {
    return this.generateOrdinary(text, brand, overrides).template;
  }
}
