export interface BonusPageFields {
  title: string;
  prize: string;
  // Optional CMS snippet name for the banner's prize text (mirrors
  // snippetDetailsName/snippetSubtitleName on the evergreen listing cards).
  snippetPrizeName?: string;
  imgUrl: string;
  heading: string; // <h3>
  introHtml: string; // first <p> — free-form, may embed a game <a> link
  tiersHtml: string; // second <p> — the "Deposit X+ -> Y FS (wager Z)" lines
  closingHtml: string; // <h4>
  bonusCode: string;
  // Pre-formatted rules content (already numbered, snippets already
  // substituted by the caller) — inserted verbatim, not reprocessed.
  rulesHtml: string;
}

/**
 * A literal field-substitution "bonus page" template — unlike
 * PromoParserService's brief-parsing pipeline, this does no text parsing at
 * all: every field is inserted into the skeleton as given. Use this when
 * the page's content doesn't fit the recurring FS-deposit-bonus shape the
 * parser expects (e.g. per-tier wager shown inline, no closing "Play X and
 * Y" line, extra banner props).
 */
export function buildBonusPage(fields: BonusPageFields): string {
  const prizeSnippetAttr = fields.snippetPrizeName
    ? `\n            snippetPrizeName="${fields.snippetPrizeName}"`
    : '';

  return `<Components.Block
                  templateName={'cms-page'}
                  mod={'promotion'}
                  typePage={'promotion'}
                  containerMod={'cms'}
                  >
  <Components.Block
            templateName="promotion-page"
            title="${fields.title}"
            prize="${fields.prize}"${prizeSnippetAttr}
            imgUrl="${fields.imgUrl}"
          >
    <h3>${fields.heading}</h3>
<p>
${fields.introHtml}
</p>
<p>
${fields.tiersHtml}
</p>
  <h4>
${fields.closingHtml}
          </h4>

    <Components.Block templateName="bonus-code-field" code={"${fields.bonusCode}"}>

    </Components.Block>
    <Components.Block
            templateName={'collapse-block'}
            title={'Bonus Rules'}
            className="promotion-page__collapse"
          >
              <p>
${fields.rulesHtml}
            </p>
          </Components.Block>

  </Components.Block>
</Components.Block>`;
}
