export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface HotPeriod {
  date: string;
  time: string;
  timeZone: string;
}

export interface ParsedTournament {
  name: string;
  provider: string;
  startDate: string;
  endDate: string;
  prizePool: MoneyAmount;
  minBet?: MoneyAmount;
  maxPrizesPerPlayer?: number;
  gameCategoryId: string;
  brandGameCategoryOverrides: Record<string, string>;
  restrictedCountries: string[];
  imageUrlDesktop: string;
  imageUrlMobile: string;
  hotPeriod?: HotPeriod;
  cashCreditHours?: number;
  rulesParagraphs: string[];
}
