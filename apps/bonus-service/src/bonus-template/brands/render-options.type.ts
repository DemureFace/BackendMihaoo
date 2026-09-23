import { PromoCardDateRange, PromoCardLink } from '../dto/promo-card.dto';

// Brand-specific knobs that don't come from the promo text itself. MW's
// renderer ignores all of these; card-based brands (BH) use them to fill
// in fields the text can't supply (which player group, publish window, ...).
export interface PromoSegmentOptions {
  segment?: 'regular' | 'vip';
  publishDateRange?: PromoCardDateRange;
  imageUrlDesktop?: string;
  // SG publishes separate desktop ("bg") and mobile ("bgMob") background
  // images — `imageUrl` covers the desktop asset, this covers mobile.
  imageUrlMobile?: string;
  description?: string;
  subtitle?: string;
  cardType?: string;
  buttonTitle?: string;
  termsLink?: Partial<PromoCardLink>;
  // Overrides each brand's default 'all_vip'/'all_except_vip' group-based
  // visibility — some campaigns target their own group codes instead (e.g.
  // "allowed_for_regulars" / "allowed_for_previp").
  allowedForGroups?: string[];
  disallowedForGroups?: string[];
}

// Knobs for the compact (details-blurb) card — a leaner alternative to
// PromoSegmentOptions' full card. Visibility groups are required, not
// optional, since this card shape has no segment-based default to fall
// back to. `imageUrlMobile` is optional here (unlike PromoSegmentOptions)
// because only some brands' compact card needs a second asset — SG's does
// (bg/bgMob), BH's doesn't (imgURL only).
export interface CompactCardOptions {
  imageUrl: string;
  imageUrlMobile?: string;
  // BH's compact card has a separate optional desktop asset field, same as
  // its full card — distinct from imageUrlMobile, not a substitute for it.
  imageUrlDesktop?: string;
  snippetDetailsName: string;
  allowedForGroups: string[];
  disallowedForGroups: string[];
  subtitle?: string;
  // MW-only: its compact card has no promo text to parse (no deposit/FS/
  // wager/code involved at all), so title/prize/category/promotionLink are
  // caller-supplied directly instead of extracted or derived from a slug.
  title?: string;
  prize?: string;
  category?: string;
  promotionLink?: string;
  showVipBadge?: boolean;
  signInOnly?: boolean;
}
