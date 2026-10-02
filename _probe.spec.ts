import { TournamentParserService } from '../apps/tournament-service/src/tournament-template/tournament-parser.service';
import { OrdinaryTournamentParserService } from '../apps/tournament-service/src/tournament-template/ordinary-tournament-parser.service';
import { BRAND_TEMPLATE_RENDERERS } from '../apps/tournament-service/src/tournament-template/brands';

const text = `Створити турнір "Gates of Olympus 2500" від провайдера Pragmatic Play
Start date: 01.10.2026 08:01 UTC
End date: 07.10.2026 21:59 UTC
Prize pool: 1 000 000 EUR
Game Categories id: пізніше додам

Restricted Countries: 
Main countries:
Australia; Bulgaria(regulated); Bahamas(regulated); Canada - Alberta(regulated); Canada - Ontario(regulated); Colombia(regulated); Denmark(regulated); Spain; France; United Kingdom(regulated); Gibraltar(regulated); India; Israel; Iran, Islamic Republic of; Italy(regulated); Korea, Democratic People's Republic of; Lithuania(regulated); Netherlands (regulated); Philippines; Peru (regulated); Portugal(regulated); Romania(regulated); Serbia(regulated); Singapore; Sweden(regulated); Taiwan; Ukraine(regulated); United States; the United Arab Emirates; South Africa(regulated); Greece (regulated); Lebanon;
Additional Countries:
Spain (regulated), Switzerland (regulated)

TOURNAMENT RULES

This tournament starts on 01.10.2026 and ends on 07.10.2026.

Only real money bets will count.

The total prize pool is 1 000 000 EUR, randomly dropping 151,000 individual prizes including cash and free spins.

Qualifying Games: Game shown under Tournament Games.

Min bet is not required

During the promotion, players must place a real-money bet of any stake value in Gates of Olympus 2500 for a chance to win a random prize.
• The maximum bet for prize payout is €2
• Free Spins prizes will be awarded at €0.2 bet value
• Players may win a maximum of two prizes during the promotional period

Cash prizes will be credited as withdrawable funds within 72 hours after the promotion ends.

You can receive updates about this tournament via email and SMS. Please enable a subscription in your profile.

[General Terms and Conditions](https://spinrise.realtime.p6m.tech/terms-and-conditions) apply.`;

describe('probe', () => {
  it('network parser', () => {
    const svc = new TournamentParserService();
    const parsed = svc.parse(text, { desktop: '/x.avif' });
    console.log('PARSED:', JSON.stringify(parsed, null, 2));
    const rendered = BRAND_TEMPLATE_RENDERERS['BH'](parsed);
    console.log('RENDERED LENGTH:', rendered.length);
  });

  it('ordinary parser throws', () => {
    const svc = new OrdinaryTournamentParserService();
    expect(() => svc.parse(text, { bgImageSrc: '/x.avif' })).toThrow();
    try {
      svc.parse(text, { bgImageSrc: '/x.avif' });
    } catch (e) {
      console.log('ORDINARY ERROR:', (e as Error).message);
    }
  });
});
