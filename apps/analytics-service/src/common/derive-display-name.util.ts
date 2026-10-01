// "vladyslav.ko" -> "Vladyslav Ko" — just a starting point; callers can
// always override it with an explicit displayName.
export function deriveDisplayName(email: string): string {
  return email
    .split('@')[0]
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}
