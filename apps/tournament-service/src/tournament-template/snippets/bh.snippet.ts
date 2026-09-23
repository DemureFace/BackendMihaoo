import { buildLocalizedAmounts } from '../currency-locale.util';
import { BhSnippetParams, NetworkSnippet } from '../dto/network-snippet.dto';
import { ParsedTournament } from '../dto/parsed-tournament.dto';
import { slugify } from '../slug.util';
import { NETWORK_SNIPPET_LOCALES } from './network-snippet-locales';

export function buildBhSnippets(
  parsed: ParsedTournament,
): Record<string, NetworkSnippet<BhSnippetParams>> {
  const link = `/tournaments/${slugify(parsed.name)}`;
  const pools = buildLocalizedAmounts(
    parsed.prizePool.amount,
    NETWORK_SNIPPET_LOCALES,
  );

  const snippets: Record<string, NetworkSnippet<BhSnippetParams>> = {};
  for (const locale of NETWORK_SNIPPET_LOCALES) {
    snippets[locale] = {
      type: 'network',
      params: {
        name: parsed.name,
        startDate: parsed.startDate,
        finishDate: parsed.endDate,
        bgImageSrc: parsed.imageUrlDesktop,
        pool: pools[locale],
        notShowForGeoIps: parsed.restrictedCountries,
        link,
      },
    };
  }
  return snippets;
}
