import { ParsedOrdinaryTournament } from '../dto/parsed-ordinary-tournament.dto';
import { OrdinaryTournamentCard } from '../dto/ordinary-tournament-card.dto';
import {
  renderOrdinaryDescription,
  renderOrdinaryTerms,
} from '../ordinary-content-renderer.util';
import { slugify } from '../slug.util';

function escapeSingleQuoted(value: string): string {
  return value.replace(/'/g, "\\'");
}

function formatPool(parsed: ParsedOrdinaryTournament): string {
  return `${parsed.poolAmount.toLocaleString('en-US')} ${parsed.poolUnit}`;
}

// "Free Spins" spelled out for the page's prose `desc`, vs. the card's
// compact "1,500 FS" — `poolUnit` is always 'FS' today (the parser never
// produces anything else), spelled out here rather than hardcoded so a
// future non-FS pool unit degrades to itself instead of silently saying
// "Free Spins" for the wrong prize type.
function formatPoolLong(parsed: ParsedOrdinaryTournament): string {
  const unit = parsed.poolUnit === 'FS' ? 'Free Spins' : parsed.poolUnit;
  return `${parsed.poolAmount.toLocaleString('en-US')} ${unit}`;
}

/** The `tournaments[]` listing-card entry for SG's landing page. */
export function renderSgOrdinaryCard(
  parsed: ParsedOrdinaryTournament,
): OrdinaryTournamentCard {
  return {
    frontendIdentifier: parsed.frontendIdentifier,
    link: `tourn/${slugify(parsed.name)}`,
    params: {
      name: parsed.name,
      pool: { default: formatPool(parsed) },
      bgImageSrc: parsed.bgImageSrc,
      ...(parsed.bgImageSrcMob ? { bgImageSrcMob: parsed.bgImageSrcMob } : {}),
    },
    disallowedForGroups: parsed.disallowedForGroups,
  };
}

/** The standalone tournament page (`Components.Tournament templateName="full"`). */
export function renderSgOrdinary(parsed: ParsedOrdinaryTournament): string {
  const name = escapeSingleQuoted(parsed.name);
  const desc = escapeSingleQuoted(
    `Prize fund: <span>${formatPoolLong(parsed)}</span>`,
  );
  const description = renderOrdinaryDescription(parsed.descriptionParagraphs);
  const terms = renderOrdinaryTerms(parsed.termsParagraphs);

  return `<Components.Block
                  templateName="cms-page"
                  mod="tournament"
                  typePage="tourn"
                  containerMod="full"
                  withoutContainer
                  withoutVerticalSpace
                  >
  <Components.Tournament
                         templateName="full"
                         frontendIdentifier="${parsed.frontendIdentifier}"
                         params={{
                         name: '${name}',
                         nameMob: '${name}',
                         bgImageSrc: '${escapeSingleQuoted(parsed.bgImageSrc)}',
                         bgImageSrcMob: '${escapeSingleQuoted(parsed.bgImageSrcMob ?? parsed.bgImageSrc)}',
                         desc: '${desc}',
                         descMob: '${desc}',
                         text: '',
                         textMob: ''
                        }}
    description={
      <>
        <h3>WELCOME TO THE TOURNAMENT</h3>
        <p>
${description}
        </p>
      </>
    }
  >

          <Components.Block
            templateName="collapse-block"
            title="Terms & Conditions"
          >
            <ul>
${terms}
            </ul>
          </Components.Block>
  </Components.Tournament>
</Components.Block>`;
}
