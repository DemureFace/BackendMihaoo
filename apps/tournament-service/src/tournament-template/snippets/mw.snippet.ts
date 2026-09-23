import {
  buildIpPoolVariants,
  CURRENCY_LOCALE_CODES,
} from '../currency-locale.util';
import { MwSnippet } from '../dto/network-snippet.dto';
import { ParsedTournament } from '../dto/parsed-tournament.dto';
import { slugify } from '../slug.util';
import { NETWORK_SNIPPET_LOCALES } from './network-snippet-locales';

export function buildMwSnippets(
  parsed: ParsedTournament,
): Record<string, MwSnippet> {
  const link = `/tournaments/${slugify(parsed.name)}`;
  const notShowForGeoIps = parsed.restrictedCountries.map((code) =>
    code.toLowerCase(),
  );
  const ipPoolVariants = buildIpPoolVariants(
    parsed.prizePool.amount,
    CURRENCY_LOCALE_CODES,
  );

  const snippets: Record<string, MwSnippet> = {};
  for (const locale of NETWORK_SNIPPET_LOCALES) {
    snippets[locale] = {
      startTime: parsed.startDate,
      endTime: parsed.endDate,
      category: 'network',
      params: {
        notShowForGeoIps,
        name: parsed.name,
        ipPool: ipPoolVariants[locale],
        link,
        bgImageSrc: parsed.imageUrlDesktop,
      },
    };
  }
  return snippets;
}
