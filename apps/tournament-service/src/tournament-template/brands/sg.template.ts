import { ParsedTournament } from '../dto/parsed-tournament.dto';
import { renderRulesList } from '../rules-renderer.util';
import { currencySymbol } from '../tournament-parser.util';

const BRAND_CODE = 'SG';

export function renderSg(parsed: ParsedTournament): string {
  const category =
    parsed.brandGameCategoryOverrides[BRAND_CODE] ?? parsed.gameCategoryId;
  const desc = `Prize fund: ${currencySymbol(parsed.prizePool.currency)}${parsed.prizePool.amount.toLocaleString('en-US')}`;
  const rulesList = renderRulesList(parsed.rulesParagraphs);

  return `<Components.Block
  templateName="cms-page"
  mod="tournament"
  typePage="tourn"
  containerMod="full"
  withoutContainer
  withoutVerticalSpace
>
  <Components.Block
    templateName="tourn-details-network"
    timer="${parsed.startDate}"
    timerText="Time left before finish:"
    category="${category}"
    params={{
      name: '${parsed.name}',

      bgImageSrc: '${parsed.imageUrlMobile}',
      bgImageSrcDesk: '${parsed.imageUrlDesktop}',

      desc: '${desc}'
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
