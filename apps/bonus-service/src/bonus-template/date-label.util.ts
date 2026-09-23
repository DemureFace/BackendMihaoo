import { BadRequestException } from '@nestjs/common';

const MONTHS = [
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

export interface DateLabel {
  year: number;
  month: number; // 0-based
  day: number;
}

/** Parses "August 6" or "August 13, 2026". `fallbackYear` covers labels with no year. */
export function parseDateLabel(
  label: string,
  fallbackYear?: number,
): DateLabel {
  const match = label.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})?/);
  if (!match) {
    throw new BadRequestException(`Could not parse date label "${label}"`);
  }
  const [, monthName, dayText, yearText] = match;
  const month = MONTHS.indexOf(monthName.toLowerCase());
  if (month === -1) {
    throw new BadRequestException(
      `Unknown month "${monthName}" in date label "${label}"`,
    );
  }
  const year = yearText ? Number(yearText) : fallbackYear;
  if (!year) {
    throw new BadRequestException(
      `Could not determine year for date label "${label}"`,
    );
  }
  return { year, month, day: Number(dayText) };
}

export function toIsoDate({ year, month, day }: DateLabel): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function toDdMm({ month, day }: DateLabel): string {
  return `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}`;
}

export function addDaysToDateLabel(label: DateLabel, days: number): DateLabel {
  const date = new Date(Date.UTC(label.year, label.month, label.day));
  date.setUTCDate(date.getUTCDate() + days);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

export interface ValidityLabels {
  validFromLabel: string;
  validToLabel: string;
}

/**
 * Default publish window: the bonus's own T&C validity dates, with the end
 * bumped a day past the last valid day (matches the given BH/SG examples:
 * T&C validity ends August 13, dateRange.end is 2026-08-14 — the CMS
 * treats the range end as exclusive). Pass a card's `publishDateRange`
 * option to override if a campaign wants different scheduling semantics.
 */
export function defaultDateRangeFromValidity({
  validFromLabel,
  validToLabel,
}: ValidityLabels): { start: string; end: string } {
  const toLabel = parseDateLabel(validToLabel);
  const fromLabel = parseDateLabel(validFromLabel, toLabel.year);
  return {
    start: toIsoDate(fromLabel),
    end: toIsoDate(addDaysToDateLabel(toLabel, 1)),
  };
}

/** e.g. "Runs 06.08 - 13.08" (BH) or "Runs 06.08-13.08" (SG) — separator is brand-specific. */
export function runsConditionLabel(
  { validFromLabel, validToLabel }: ValidityLabels,
  separator = ' - ',
): string {
  const toLabel = parseDateLabel(validToLabel);
  const fromLabel = parseDateLabel(validFromLabel, toLabel.year);
  return `Runs ${toDdMm(fromLabel)}${separator}${toDdMm(toLabel)}`;
}
