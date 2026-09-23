export type CurrencyPosition = 'before' | 'after';

export interface ConversionRule {
  rate: number;
  symbol: string;
  position: CurrencyPosition;
  separator: string;
  decimal: string;
  spaceBefore?: boolean;
}

export interface CurrencyConfig {
  rules: Record<string, ConversionRule>;
  localesWithSpaceAfter: string[];
  siteLocales: Record<string, string[]>;
  siteTranslationTargets: Record<string, string[]>;
  defaultFormatLocaleByTarget: Record<string, string>;
}

export const CURRENCY_CONFIG = Symbol('CURRENCY_CONFIG');

export const currencyConfig: CurrencyConfig = {
  rules: {
    en: {
      rate: 1,
      symbol: '€',
      position: 'before',
      separator: ',',
      decimal: '.',
    },
    au: {
      rate: 1.5,
      symbol: '$',
      position: 'before',
      separator: ',',
      decimal: '.',
    },
    nz: {
      rate: 1.5,
      symbol: '$',
      position: 'before',
      separator: ',',
      decimal: '.',
    },
    ca: {
      rate: 1.5,
      symbol: '$',
      position: 'before',
      separator: ',',
      decimal: '.',
    },
    de: {
      rate: 1,
      symbol: '€',
      position: 'after',
      separator: '.',
      decimal: ',',
    },
    fr: {
      rate: 1,
      symbol: '€',
      position: 'after',
      separator: ',',
      decimal: '.',
    },
    it: {
      rate: 1,
      symbol: '€',
      position: 'before',
      separator: ',',
      decimal: '.',
    },
    no: {
      rate: 10,
      symbol: 'kr',
      position: 'after',
      separator: ',',
      decimal: '.',
    },
    pt: {
      rate: 1,
      symbol: '€',
      position: 'after',
      separator: '.',
      decimal: ',',
    },
    gr: {
      rate: 1,
      symbol: '€',
      position: 'after',
      separator: ',',
      decimal: '.',
    },
    et: {
      rate: 1,
      symbol: '€',
      position: 'after',
      separator: ' ',
      decimal: ',',
      spaceBefore: true,
    },
    fi: {
      rate: 1,
      symbol: '€',
      position: 'after',
      separator: ' ',
      decimal: ',',
      spaceBefore: true,
    },
    at: {
      rate: 1,
      symbol: '€',
      position: 'after',
      separator: '.',
      decimal: ',',
    },
    ch: {
      rate: 1,
      symbol: '€',
      position: 'after',
      separator: '.',
      decimal: ',',
    },
    es: {
      rate: 1,
      symbol: '€',
      position: 'after',
      separator: '.',
      decimal: ',',
    },
    gb: {
      rate: 1,
      symbol: '£',
      position: 'before',
      separator: ',',
      decimal: '.',
    },
  },
  localesWithSpaceAfter: ['de', 'at', 'ch', 'no', 'et', 'fi', 'es'],
  siteLocales: {
    Winorio: ['nz', 'pt', 'fr', 'gb', 'gr', 'de', 'default'],
    Spinrise: ['au', 'nz', 'ca', 'de', 'at', 'ch', 'fr', 'it', 'no', 'default'],
    JeetCity: ['au', 'nz', 'ca', 'de', 'at', 'ch', 'fr', 'it', 'no', 'default'],
    Moonwin: ['au', 'nz', 'ca', 'de', 'at', 'ch', 'fr', 'it', 'no', 'default'],
    SlotsGallery: [
      'au',
      'nz',
      'ca',
      'de',
      'at',
      'ch',
      'fr',
      'it',
      'no',
      'default',
    ],
    BohoCasino: [
      'au',
      'nz',
      'ca',
      'de',
      'at',
      'ch',
      'fr',
      'it',
      'no',
      'es-mx',
      'pt-mz',
      'default',
    ],
  },
  siteTranslationTargets: {
    Winorio: ['de', 'el', 'fr', 'pt'],
    Spinrise: ['de', 'en-au', 'fr', 'it', 'no'],
    JeetCity: ['de', 'en-au', 'fr', 'it', 'no'],
    Moonwin: ['de', 'en-au', 'fr', 'it', 'no'],
    SlotsGallery: ['de', 'en-au', 'fr', 'it', 'no'],
    BohoCasino: ['de', 'en-au', 'fr', 'it', 'no', 'es-mx', 'pt-mz'],
  },
  defaultFormatLocaleByTarget: {
    de: 'de',
    'en-au': 'au',
    fr: 'fr',
    it: 'it',
    no: 'no',
    el: 'gr',
    pt: 'pt',
    'es-mx': 'es',
    'pt-mz': 'pt',
  },
};
