// RFC 4180: a field containing a comma, quote, or newline must be wrapped
// in quotes, with internal quotes doubled.
export function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}
