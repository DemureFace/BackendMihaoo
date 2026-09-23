import { ParsedOrdinaryTournament } from '../dto/parsed-ordinary-tournament.dto';
import {
  renderOrdinaryDescription,
  renderOrdinaryTerms,
} from '../ordinary-content-renderer.util';

function escapeSingleQuoted(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function renderBohoOrdinary(parsed: ParsedOrdinaryTournament): string {
  const pool = `${parsed.poolAmount.toLocaleString('en-US')} ${parsed.poolUnit}`;
  const description = renderOrdinaryDescription(parsed.descriptionParagraphs);
  const terms = renderOrdinaryTerms(parsed.termsParagraphs);

  return `<Components.Block
                  templateName={'cms-page'}
                  mod={'tournament'}
                  typePage={'tourn'}
                  containerMod={'full'}
                  withoutVerticalSpace
                  >
  <Components.Tournament
                         templateName="full"
                         frontendIdentifier="${parsed.frontendIdentifier}"
                         params={{
                         name: '${escapeSingleQuoted(parsed.name)}',
                         bgImageSrc:  '${escapeSingleQuoted(parsed.bgImageSrc)}',
                         pool: '${escapeSingleQuoted(pool)}',
                        }}>

<Components.Block
            templateName="collapse-block"
            className="collapse-block--with-separator"
            title={'Description'}
          >
            <p>
${description}
            </p>
          </Components.Block>

          <Components.Block
            templateName="collapse-block"
            className="collapse-block--with-separator"
            title={'Terms & Conditions'}
          >
            <ol>
${terms}
            </ol>
          </Components.Block>
  </Components.Tournament>
</Components.Block>`;
}
