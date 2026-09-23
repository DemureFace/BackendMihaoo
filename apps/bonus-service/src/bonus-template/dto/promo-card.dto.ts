export interface PromoCardLink {
  title: string;
  url: string;
  isModal: boolean;
}

export interface PromoCardDateRange {
  start: string;
  end: string;
}

// The index signature lets these satisfy PromoRenderResult's loosely-typed
// `card?: Record<string, unknown>` while still giving named fields for the
// brand's own renderer to build against.
export interface BhPromoCard {
  [key: string]: unknown;
  title: string;
  prize: string;
  description: string;
  imgURL: string;
  snippetDetailsName: string;
  imgURLDesktop: string;
  bonusCode: string;
  buttonTitle: string;
  link: PromoCardLink;
  allowedForGroups?: string[];
  disallowedForGroups?: string[];
  signInOnly?: true;
  type: string;
  // Absent when the brief has no "runs from X to Y" validity sentence at
  // all (an evergreen offer, e.g. a standing "Game of the Month") — there's
  // no date to compute either from in that case.
  dateRange?: PromoCardDateRange;
  condition?: string;
}

// BhPromoCard minus dateRange/condition (no T&C parsing needed) — a
// `description` blurb (deposit/FS/wager/code) replaces BH's normal
// caller-supplied description. Visibility groups are required, not
// defaulted from segment, same reasoning as SgCompactCard.
export interface BhCompactCard {
  [key: string]: unknown;
  title: string;
  prize: string;
  description: string;
  imgURL: string;
  snippetDetailsName: string;
  imgURLDesktop: string;
  bonusCode: string;
  buttonTitle: string;
  link: PromoCardLink;
  allowedForGroups: string[];
  disallowedForGroups: string[];
  type: string;
}

// A leaner, listing-only card shape used by some SG campaigns instead of
// SgPromoCard — no description/type/dateRange/condition/link, but adds a
// `details` blurb (deposit/FS/wagering/code) built from the promo text.
// Visibility groups are caller-supplied per campaign rather than defaulted
// from segment, since these campaigns use their own group codes (e.g.
// "allowed_for_regulars"/"allowed_for_previp") instead of "all_vip"/
// "all_except_vip".
export interface SgCompactCard {
  [key: string]: unknown;
  title: string;
  pool: string;
  subtitle: string;
  details: string;
  bonusCode: string;
  snippetDetailsName: string;
  bg: string;
  bgMob: string;
  allowedForGroups: string[];
  disallowedForGroups: string[];
}

// MW's lobby/listing-tile card — much leaner than BH/SG's: no bonus code,
// no description/details blurb, no dateRange/condition. MW previously had
// no card concept at all (renderMw only ever produced a `template`); this
// is a fully caller-supplied shape (no promo text parsed for it) since it
// has no deposit/FS/wager info to derive.
export interface MwPromoCard {
  [key: string]: unknown;
  title: string;
  promotionLink: string;
  imgURL: string;
  prize: string;
  category: string;
  allowedForGroups: string[];
  disallowedForGroups: string[];
  // Only present when `prize` has a euro amount for it to name — a prize
  // with no currency in it (e.g. "40 FS – ...") has nothing to substitute.
  snippetPrizeName?: string;
  showVipBadge?: boolean;
  signInOnly?: boolean;
}

// SG's listing-card shape — different field names (pool/bg/bgMob) and a
// VIP-only `signInOnly` flag; not the same schema as BH's card at all.
export interface SgPromoCard {
  [key: string]: unknown;
  title: string;
  pool: string;
  subtitle: string;
  description: string;
  bg: string;
  bgMob: string;
  snippetDetailsName: string;
  imgURLDesktop: string;
  bonusCode: string;
  signInOnly?: true;
  buttonTitle: string;
  link: PromoCardLink;
  allowedForGroups: string[];
  disallowedForGroups: string[];
  type: string;
  // Absent when the brief has no "runs from X to Y" validity sentence at
  // all (an evergreen offer, e.g. a standing "Game of the Month") — there's
  // no date to compute either from in that case.
  dateRange?: PromoCardDateRange;
  condition?: string;
}
