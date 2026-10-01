import {
  boldCode,
  linkGames,
  linkTermsBold,
  preserveTagAdjacentSpaces,
  toTitleCase,
} from './text-substitution.util';

describe('boldCode', () => {
  it('wraps every whole-word occurrence of the code in <b>', () => {
    expect(boldCode('Use code WELCOME50 at checkout', 'WELCOME50')).toBe(
      'Use code <b>WELCOME50</b> at checkout',
    );
  });

  it('does not touch a code that only appears as part of a longer word', () => {
    expect(boldCode('WELCOME500 is different', 'WELCOME50')).toBe(
      'WELCOME500 is different',
    );
  });

  it('returns the text unchanged when code is empty', () => {
    expect(boldCode('no code here', '')).toBe('no code here');
  });
});

describe('linkGames', () => {
  it('links every occurrence of every named game', () => {
    const result = linkGames('Play Book of Ra or Book of Ra again', [
      { name: 'Book of Ra', slug: 'book-of-ra' },
    ]);

    expect(result).toBe(
      'Play <a href="/game/book-of-ra"><b>Book of Ra</b></a> or <a href="/game/book-of-ra"><b>Book of Ra</b></a> again',
    );
  });

  it('leaves text unchanged when the game name is absent', () => {
    expect(
      linkGames('Play Starburst', [{ name: 'Book of Ra', slug: 'book-of-ra' }]),
    ).toBe('Play Starburst');
  });

  it('handles an empty game link list', () => {
    expect(linkGames('Play Book of Ra', [])).toBe('Play Book of Ra');
  });
});

describe('linkTermsBold', () => {
  it('links and bolds "Bonus Terms and Conditions"', () => {
    expect(linkTermsBold('See Bonus Terms and Conditions for details')).toBe(
      'See <a href="/bonus-terms-and-conditions"><b>Bonus Terms and Conditions</b></a> for details',
    );
  });

  it('also matches the "General " prefix and includes it in the link', () => {
    expect(linkTermsBold('See General Bonus Terms and Conditions')).toBe(
      'See <a href="/bonus-terms-and-conditions"><b>General Bonus Terms and Conditions</b></a>',
    );
  });

  it('leaves text with no terms mention unchanged', () => {
    expect(linkTermsBold('Nothing to link here')).toBe('Nothing to link here');
  });
});

describe('toTitleCase', () => {
  it('capitalizes the first letter of every word', () => {
    expect(toTitleCase('welcome bonus offer')).toBe('Welcome Bonus Offer');
  });

  it('lowercases the rest of an already-uppercase word', () => {
    expect(toTitleCase('WELCOME BONUS')).toBe('Welcome Bonus');
  });
});

describe('preserveTagAdjacentSpaces', () => {
  it('replaces a plain space immediately before an opening tag with a non-breaking space', () => {
    expect(preserveTagAdjacentSpaces('from <b>August</b>')).toBe(
      'from <b>August</b>',
    );
  });

  it('does not touch a space after a closing tag', () => {
    expect(preserveTagAdjacentSpaces('Welcome</b> promotion')).toBe(
      'Welcome</b> promotion',
    );
  });

  it('leaves text with no tags unchanged', () => {
    expect(preserveTagAdjacentSpaces('plain text')).toBe('plain text');
  });
});
