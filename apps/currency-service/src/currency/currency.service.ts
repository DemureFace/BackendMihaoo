import { Inject, Injectable } from '@nestjs/common';
import { CURRENCY_CONFIG } from './config/currency.config';
import type { CurrencyConfig } from './config/currency.config';

const CURRENCY_TOKEN = /([€$£])\s?(\d[\d.,]*)|(\d[\d.,]*)\s?([€$£]|kr)/g;

@Injectable()
export class CurrencyService {
  constructor(
    @Inject(CURRENCY_CONFIG) private readonly config: CurrencyConfig,
  ) {}

  listSites(): string[] {
    return Object.keys(this.config.siteLocales);
  }

  formatNumber(value: number, locale: string): string {
    const rule = this.config.rules[locale] ?? this.config.rules.en;
    const [intPart, decPart] = value.toFixed(2).split('.');
    let dec = decPart;
    if (dec === '00') dec = '';
    else if (dec[1] === '0') dec = dec[0];

    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, rule.separator);
    return dec ? `${grouped}${rule.decimal}${dec}` : grouped;
  }

  convertAmount(value: number, locale: string): number {
    const rule = this.config.rules[locale] ?? this.config.rules.en;
    const converted = value * rule.rate;
    return locale === 'no' ? Math.round(converted) : converted;
  }

  convertText(text: string, locale: string): string {
    const rule = this.config.rules[locale] ?? this.config.rules.en;

    return text.replace(
      CURRENCY_TOKEN,
      (
        match: string,
        symbolBefore: string | undefined,
        amountA: string | undefined,
        amountB: string | undefined,
        symbolAfter: string | undefined,
      ) => {
        let rawAmount = symbolBefore ? amountA : amountB;
        if (!rawAmount || !/\d/.test(rawAmount)) return match;

        let trailing = '';
        const trailingMatch = rawAmount.match(/([.,]+)$/);
        if (trailingMatch) {
          trailing = trailingMatch[1];
          rawAmount = rawAmount.slice(0, -trailing.length);
        }

        const normalized = this.parseAmount(rawAmount);
        if (normalized === null) return match;

        const sourceSymbol = symbolBefore || symbolAfter || '';
        const sourceRate =
          sourceSymbol === '$' ? 1.5 : sourceSymbol === 'kr' ? 10 : 1;

        const amountInEur = normalized / sourceRate;
        const converted = this.convertAmount(amountInEur, locale);
        const formatted = this.formatNumber(converted, locale);

        const positioned =
          rule.position === 'before'
            ? rule.symbol + formatted
            : this.config.localesWithSpaceAfter.includes(locale) ||
                rule.spaceBefore
              ? `${formatted} ${rule.symbol}`
              : `${formatted}${rule.symbol}`;

        return positioned + trailing;
      },
    );
  }

  convertForSite(
    text: string,
    site: string,
    defaultLocaleOverride?: string,
  ): Record<string, string> {
    const locales = this.config.siteLocales[site] ?? ['default'];
    const result: Record<string, string> = {};

    for (const loc of locales) {
      const effectiveLocale =
        loc === 'default' ? (defaultLocaleOverride ?? 'en') : loc;
      result[loc] = this.convertText(text, effectiveLocale);
    }
    return result;
  }

  wrapAsSnippet(map: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(map).map(([loc, val]) => [loc, `<span>${val}</span>`]),
    );
  }

  getTranslationTargets(site: string): string[] {
    return this.config.siteTranslationTargets[site] ?? [];
  }

  getDefaultFormatLocale(target: string): string | undefined {
    return this.config.defaultFormatLocaleByTarget[target];
  }

  private parseAmount(raw: string): number | null {
    const cleaned = raw.replace(/\s+/g, '');
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    const lastSep = Math.max(lastDot, lastComma);
    const hasDecimal = lastSep >= 0 && cleaned.length - lastSep <= 3;

    const normalized = hasDecimal
      ? `${cleaned.slice(0, lastSep).replace(/[.,]/g, '')}.${cleaned.slice(lastSep + 1)}`
      : cleaned.replace(/[.,]/g, '');

    const value = parseFloat(normalized);
    return Number.isNaN(value) ? null : value;
  }
}
