import {
  addDaysToDateLabel,
  defaultDateRangeFromValidity,
  parseDateLabel,
  runsConditionLabel,
  toDdMm,
  toIsoDate,
} from './date-label.util';

describe('parseDateLabel', () => {
  it('uses the fallback year when the label has none', () => {
    expect(parseDateLabel('August 6', 2026)).toEqual({
      year: 2026,
      month: 7,
      day: 6,
    });
  });

  it('prefers the year embedded in the label over the fallback', () => {
    expect(parseDateLabel('August 13, 2026', 2099)).toEqual({
      year: 2026,
      month: 7,
      day: 13,
    });
  });

  it('throws when the label has no year and no fallback is given', () => {
    expect(() => parseDateLabel('August 6')).toThrow(
      'Could not determine year for date label "August 6"',
    );
  });

  it('throws on an unrecognized month name', () => {
    expect(() => parseDateLabel('Frobruary 5', 2026)).toThrow(
      'Unknown month "Frobruary" in date label "Frobruary 5"',
    );
  });

  it('throws when the label cannot be parsed at all', () => {
    expect(() => parseDateLabel('not a date', 2026)).toThrow(
      'Could not parse date label "not a date"',
    );
  });
});

describe('toIsoDate / toDdMm', () => {
  const label = { year: 2026, month: 7, day: 6 };

  it('formats as zero-padded ISO date', () => {
    expect(toIsoDate(label)).toBe('2026-08-06');
  });

  it('formats as zero-padded dd.mm', () => {
    expect(toDdMm(label)).toBe('06.08');
  });
});

describe('addDaysToDateLabel', () => {
  it('adds days within the same month', () => {
    expect(addDaysToDateLabel({ year: 2026, month: 7, day: 13 }, 1)).toEqual({
      year: 2026,
      month: 7,
      day: 14,
    });
  });

  it('rolls over into the next year across a December 31st boundary', () => {
    expect(addDaysToDateLabel({ year: 2026, month: 11, day: 31 }, 1)).toEqual({
      year: 2027,
      month: 0,
      day: 1,
    });
  });
});

describe('defaultDateRangeFromValidity', () => {
  it('starts at the validity start and ends the day after the validity end', () => {
    expect(
      defaultDateRangeFromValidity({
        validFromLabel: 'August 6',
        validToLabel: 'August 13, 2026',
      }),
    ).toEqual({ start: '2026-08-06', end: '2026-08-14' });
  });
});

describe('runsConditionLabel', () => {
  it('defaults to a spaced dash separator', () => {
    expect(
      runsConditionLabel({
        validFromLabel: 'August 6',
        validToLabel: 'August 13, 2026',
      }),
    ).toBe('Runs 06.08 - 13.08');
  });

  it('accepts a custom separator', () => {
    expect(
      runsConditionLabel(
        { validFromLabel: 'August 6', validToLabel: 'August 13, 2026' },
        '-',
      ),
    ).toBe('Runs 06.08-13.08');
  });
});
