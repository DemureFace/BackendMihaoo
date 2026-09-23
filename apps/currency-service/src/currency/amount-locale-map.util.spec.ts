import {
  buildAmountLocaleMap,
  buildAmountLocaleMapText,
  parseAmount,
} from './amount-locale-map.util';

describe('parseAmount', () => {
  it('parses a plain amount with a trailing currency symbol', () => {
    expect(parseAmount('5000€')).toBe(5000);
  });

  it('parses a plain amount with a leading currency symbol', () => {
    expect(parseAmount('€5000')).toBe(5000);
  });

  it('treats a comma as a thousands separator when followed by 3+ digits', () => {
    expect(parseAmount('$5,000')).toBe(5000);
  });

  it('treats the last separator as decimal when followed by 1-2 digits', () => {
    expect(parseAmount('5.000,50')).toBe(5000.5);
  });

  it('throws when no digits can be parsed', () => {
    expect(() => parseAmount('abc')).toThrow(
      'Could not parse an amount out of "abc"',
    );
  });
});

describe('buildAmountLocaleMap', () => {
  const map = buildAmountLocaleMap('1000');

  it('applies the AU/NZ/CA 1.5x rate with a leading unspaced $', () => {
    expect(map.en.au).toBe('$1,500');
    expect(map.en.nz).toBe('$1,500');
    expect(map.en.ca).toBe('$1,500');
  });

  it('formats DE/AT/CH with a dot thousands separator and trailing spaced €', () => {
    expect(map.en.de).toBe('1.000 €');
    expect(map.en.at).toBe('1.000 €');
    expect(map.en.ch).toBe('1.000 €');
  });

  it('applies the 10x NOK rate', () => {
    expect(map.en.no).toBe('10,000 kr');
  });

  it("falls back the 'en' default entry to the generic (it-style) EUR format", () => {
    expect(map.en.default).toBe(map.en.it);
    expect(map.en.default).toBe('€1,000');
  });

  it("uses each output language's own locale as its default entry", () => {
    expect(map.de.default).toBe(map.de.de);
    expect(map.es.default).toBe(map.es.es);
  });
});

describe('buildAmountLocaleMapText', () => {
  it('renders one comma-joined block per output language with no trailing comma', () => {
    const text = buildAmountLocaleMapText('1000');

    expect(text).toContain("en: \nau: '$1,500',");
    expect(text).toContain("default: '€1,000'");
    expect(text).not.toContain("default: '€1,000',");
  });
});
