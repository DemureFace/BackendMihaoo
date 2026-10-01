import { Brand, Platform, TaskType } from '../generated/prisma';

// Storage codes stay the Prisma-safe identifiers; these are the only two
// codes whose UI label actually differs from the code itself.
export const PLATFORM_NAMES: Record<Platform, string> = {
  [Platform.SS]: 'SS',
  [Platform.P8]: '8P',
  [Platform.TL]: 'TL',
};

export const BRAND_NAMES: Record<Brand, string> = {
  [Brand.JC]: 'JC',
  [Brand.MW]: 'MW',
  [Brand.SR]: 'SR',
  [Brand.SG]: 'SG',
  [Brand.BH]: 'BH',
  [Brand.WR]: 'WR',
  [Brand.RO]: 'RO',
  [Brand.TS]: 'TS',
  [Brand.CG]: 'CG',
  [Brand.WK]: 'WK',
  [Brand.NS]: 'NS',
  [Brand.TL]: 'TL',
  [Brand.HL]: 'HL',
  [Brand.SRH]: 'SRH',
  [Brand.SA]: 'SA',
  [Brand.RANDOM]: 'Random',
};

export const TASK_TYPE_NAMES: Record<TaskType, string> = {
  [TaskType.NETWORK_TOURNAMENT]: 'Network Tournament',
  [TaskType.PROMO]: 'Promo',
  [TaskType.SLIDER]: 'Slider',
  [TaskType.PROMO_LANDING]: 'Promo Landing',
  [TaskType.AFFILIATE_LANDING]: 'Affiliate Landing',
  [TaskType.LEGAL]: 'Legal',
  [TaskType.NEW_GEO_SETUP]: 'New GEO Setup',
  [TaskType.NEW_BRAND_SETUP]: 'New Brand Setup',
  [TaskType.VIP]: 'VIP',
  [TaskType.LOYALTY]: 'Loyalty',
  [TaskType.GAME_CATEGORIES]: 'Game Categories',
  [TaskType.TRANSLATION_KEY]: 'Translation Key',
  [TaskType.BUG]: 'Bug',
  [TaskType.OTHER]: 'Other',
};

// Which brands are selectable per platform. RANDOM is deliberately absent
// from every list — it bypasses the brand/platform check entirely (see
// isBrandValidForPlatform) rather than being tied to one platform. RO is
// also deliberately absent — see the Brand enum comment in schema.prisma.
export const BRAND_PLATFORM_MAP: Record<Platform, Brand[]> = {
  [Platform.SS]: [
    Brand.WR,
    Brand.SR,
    Brand.TS,
    Brand.JC,
    Brand.MW,
    Brand.SG,
    Brand.BH,
  ],
  [Platform.P8]: [Brand.CG, Brand.WK, Brand.NS],
  [Platform.TL]: [Brand.TL, Brand.HL, Brand.SRH, Brand.SA],
};

export function isBrandValidForPlatform(brand: Brand, platform: Platform): boolean {
  return brand === Brand.RANDOM || BRAND_PLATFORM_MAP[platform].includes(brand);
}
