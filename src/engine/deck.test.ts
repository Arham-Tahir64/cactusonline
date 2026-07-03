import { describe, expect, it } from 'vitest';
import { cardValue, createDeck, createRng, shuffle } from './deck.js';

describe('createDeck', () => {
  it('builds a standard 52-card deck with unique ids and no jokers', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  it('deck values sum correctly (red kings -1, black kings 12)', () => {
    const deck = createDeck();
    // Per suit: A(0)+2..10(54)+J(10)+Q(10) = 74. Kings: 2*(-1) + 2*12 = 22.
    const expected = 74 * 4 + 22;
    expect(deck.reduce((s, c) => s + c.value, 0)).toBe(expected);
  });
});

describe('cardValue', () => {
  it('scores every special case from the rules table', () => {
    expect(cardValue('K', 'H')).toBe(-1);
    expect(cardValue('K', 'D')).toBe(-1);
    expect(cardValue('K', 'S')).toBe(12);
    expect(cardValue('K', 'C')).toBe(12);
    expect(cardValue('A', 'S')).toBe(0);
    expect(cardValue('2', 'H')).toBe(2);
    expect(cardValue('10', 'C')).toBe(10);
    expect(cardValue('J', 'D')).toBe(10);
    expect(cardValue('Q', 'S')).toBe(10);
  });
});

describe('shuffle', () => {
  it('is deterministic for a given seed and is a permutation', () => {
    const a = shuffle(createDeck(), createRng(7));
    const b = shuffle(createDeck(), createRng(7));
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
    expect(new Set(a.map((c) => c.id)).size).toBe(52);
  });

  it('different seeds give different orders', () => {
    const a = shuffle(createDeck(), createRng(1));
    const b = shuffle(createDeck(), createRng(2));
    expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id));
  });
});
