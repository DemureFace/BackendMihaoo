import { ParsedTournament } from '../dto/parsed-tournament.dto';
import { buildIpPoolVariants } from '../currency-locale.util';
import { renderRulesList } from '../rules-renderer.util';

const BRAND_CODE = 'MW';
const IP_POOL_LOCALES = [
  'au',
  'nz',
  'ca',
  'en',
  'de',
  'it',
  'no',
  'fr',
  'es',
  'pt',
];
const DEFAULT_LOCALE = 'en';

export function renderMw(
  parsed: ParsedTournament,
  locale = DEFAULT_LOCALE,
): string {
  const category =
    parsed.brandGameCategoryOverrides[BRAND_CODE] ?? parsed.gameCategoryId;
  const poolVariants = buildIpPoolVariants(
    parsed.prizePool.amount,
    IP_POOL_LOCALES,
  );
  const pool = poolVariants[locale] ?? poolVariants[DEFAULT_LOCALE];
  const poolEntries = Object.entries(pool)
    .map(([key, value]) => `        ${key}: '${value}',`)
    .join('\n');
  const rulesList = renderRulesList(parsed.rulesParagraphs);

  return `<Components.Block
  templateName={'cms-page'}
  mod={'tournament'}
  typePage={'tourn'}
  containerMod={'full'}
>
  <Components.Block
    templateName="tourn-network"
    startTime="${parsed.startDate}"
    endTime="${parsed.endDate}"
    category="${category}"
    params={{
      name: { default: '${parsed.name}' },
      showPrizes: false,
      bgImageSrc: '${parsed.imageUrlDesktop}',
      bgImageSrcMob: '${parsed.imageUrlMobile}',
      pool: {
${poolEntries}
      },
      gameBtn: { default: 'Show Games' },
    }}
  >
    <Components.Block
      templateName="collapse-block"
      title={'TOURNAMENT RULES'}
    >
${rulesList}
    </Components.Block>
  </Components.Block>
</Components.Block>`;
}

export function renderMwLocales(
  parsed: ParsedTournament,
): Record<string, string> {
  const variants: Record<string, string> = {};
  for (const locale of IP_POOL_LOCALES) {
    variants[locale] = renderMw(parsed, locale);
  }
  return variants;
}
