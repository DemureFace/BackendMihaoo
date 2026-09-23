import { ParsedTournament } from '../dto/parsed-tournament.dto';
import { renderRulesList } from '../rules-renderer.util';
import { currencySymbol } from '../tournament-parser.util';

const BRAND_CODE = 'BH';

export function renderBoho(parsed: ParsedTournament): string {
  const collection =
    parsed.brandGameCategoryOverrides[BRAND_CODE] ?? parsed.gameCategoryId;
  const pool = `${currencySymbol(parsed.prizePool.currency)}${parsed.prizePool.amount.toLocaleString('en-US')} total`;
  const rulesList = renderRulesList(parsed.rulesParagraphs);

  return `<Components.Block templateName="cms-page" mod="tournament" typePage="tourn" containerMod="full">
  <Components.Block
    templateName="tourn-network"
    name="${parsed.name}"
    startDate="${parsed.startDate}"
    finishDate="${parsed.endDate}"
    bgImageSrc="${parsed.imageUrlDesktop}"
    pool="${pool}"
    collection="${collection}"
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
