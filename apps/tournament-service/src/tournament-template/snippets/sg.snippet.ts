import {
  buildLocalizedAmounts,
  formatCurrencyForLocale,
} from '../currency-locale.util';
import { NetworkSnippet, SgSnippetParams } from '../dto/network-snippet.dto';
import { ParsedTournament } from '../dto/parsed-tournament.dto';
import { slugify } from '../slug.util';
import { BET_PHRASES } from './bet-phrases';
import { NETWORK_SNIPPET_LOCALES } from './network-snippet-locales';
import { TIMER_TEXTS } from './timer-texts';

export function buildSgSnippets(
  parsed: ParsedTournament,
): Record<string, NetworkSnippet<SgSnippetParams>> {
  const link = `/tourn/${slugify(parsed.name)}`;
  const pools = buildLocalizedAmounts(
    parsed.prizePool.amount,
    NETWORK_SNIPPET_LOCALES,
  );

  const snippets: Record<string, NetworkSnippet<SgSnippetParams>> = {};
  for (const locale of NETWORK_SNIPPET_LOCALES) {
    const phrases = BET_PHRASES[locale];
    const bet = parsed.minBet
      ? `${formatCurrencyForLocale(parsed.minBet.amount, locale)} ${phrases.withBet}`
      : phrases.noBet;

    snippets[locale] = {
      type: 'network',
      params: {
        startTime: parsed.startDate,
        endTime: parsed.endDate,
        pool: pools[locale],
        name: parsed.name,
        bet,
        timerText: TIMER_TEXTS[locale],
        bgImageSrc: parsed.imageUrlDesktop,
        link,
        notShowForGeoIps: parsed.restrictedCountries,
      },
    };
  }
  return snippets;
}
