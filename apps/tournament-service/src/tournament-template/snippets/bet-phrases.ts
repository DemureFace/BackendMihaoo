export interface BetPhrase {
  withBet: string;
  noBet: string;
}

export const BET_PHRASES: Record<string, BetPhrase> = {
  en: {
    withBet: 'or currency equivalent',
    noBet: 'No minimum bet size requirement',
  },
  au: {
    withBet: 'or currency equivalent',
    noBet: 'No minimum bet size requirement',
  },
  de: {
    withBet: 'oder Währungsäquivalent',
    noBet: 'Kein Mindesteinsatz',
  },
  fr: {
    withBet: 'ou équivalent en devise',
    noBet: 'Aucune mise minimum',
  },
  it: {
    withBet: 'o equivalente in valuta',
    noBet: 'Nessuna puntata minima',
  },
  es: {
    withBet: 'o equivalente en otra moneda',
    noBet: 'Sin apuesta mínima',
  },
  pt: {
    withBet: 'ou equivalente noutra moeda',
    noBet: 'Sem aposta mínima',
  },
  no: {
    withBet: 'eller tilsvarende valuta',
    noBet: 'Ingen minimumsinnsats',
  },
};
