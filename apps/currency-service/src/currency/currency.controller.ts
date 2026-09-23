import { Body, Controller, Get, Header, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'common/common';
import { ConvertTextDto } from './dto/convert-text.dto';
import { AmountBreakdownDto } from './dto/amount-breakdown.dto';
import { CurrencyService } from './currency.service';
import { TranslationService } from '../translation/translation.service';
import {
  buildAmountLocaleMap,
  buildAmountLocaleMapText,
} from './amount-locale-map.util';

@UseGuards(JwtAuthGuard)
@Controller('currency')
export class CurrencyController {
  constructor(
    private readonly currencyService: CurrencyService,
    private readonly translationService: TranslationService,
  ) {}

  @Get('sites')
  listSites() {
    return this.currencyService.listSites();
  }

  @Post('convert')
  async convert(@Body() dto: ConvertTextDto) {
    const baseMap = this.currencyService.convertForSite(dto.text, dto.site);
    const en = this.currencyService.wrapAsSnippet(baseMap);

    const targets = this.currencyService.getTranslationTargets(dto.site);
    const translations: Record<string, Record<string, string>> = {};

    for (const target of targets) {
      const formatLocale = this.currencyService.getDefaultFormatLocale(target);
      const targetMap = this.currencyService.convertForSite(
        dto.text,
        dto.site,
        formatLocale,
      );

      const entries = await Promise.all(
        Object.entries(targetMap).map(async ([locale, value]) => {
          const translated = await this.translationService.translate(
            value,
            target,
          );
          return [locale, `<span>${translated}</span>`] as const;
        }),
      );

      translations[target] = Object.fromEntries(entries);
    }

    return { en, translations };
  }

  // Pure parser, no DB/translation involved — for a single amount (e.g.
  // "5000€"), returns its formatting in every output language, each with
  // the full au/nz/ca/.../pt breakdown plus a "default" in that
  // language's own locale.
  @Post('breakdown')
  breakdown(@Body() dto: AmountBreakdownDto) {
    return buildAmountLocaleMap(dto.amount);
  }

  @Post('breakdown/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  breakdownText(@Body() dto: AmountBreakdownDto): string {
    return buildAmountLocaleMapText(dto.amount);
  }
}
