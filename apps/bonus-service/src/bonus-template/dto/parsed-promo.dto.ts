export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface DepositTier {
  depositMin: MoneyAmount;
  freeSpinsCount: number;
  // Absent when the brief's tier line has no "at <amount>" clause — only
  // MW's page rendering needs this value; it enforces its own presence.
  freeSpinValue?: MoneyAmount;
}

export interface GameLink {
  name: string;
  slug: string;
}

export interface ParsedPromo {
  title: string;
  prize: string;
  buttonText?: string;
  segment?: 'regular' | 'vip';
  code: string;
  heading: string;
  introText: string;
  tiers: DepositTier[];
  actionText: string;
  gameLinks: GameLink[];
  termsPoints: string[];
  // Raw T&C text (pre-point-splitting) — brands whose rules template needs
  // structured facts (dates, per-tier wager/max-win, ...) parse this
  // directly instead of consuming `termsPoints`. See terms-facts.util.ts.
  termsRawText: string;
  // Raw promo-page body text (pre-line-splitting), between the banner and
  // T&C markers — unlike `heading`/`introText`/`tiers`, this survives
  // regardless of whether the brief's body uses one squished paragraph or
  // separate lines per field. Used to build a default card `description`
  // that preserves each tier's exact wording (e.g. "20 High-Bet FS", not
  // just the bare FS count `tiers` normalizes to). See description.util.ts.
  bodyRawText: string;
}
