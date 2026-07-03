import type { Card, Rank, Suit } from './types.js';

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const RED_SUITS: ReadonlySet<Suit> = new Set(['H', 'D']);

export function cardValue(rank: Rank, suit: Suit): number {
  switch (rank) {
    case 'K':
      return RED_SUITS.has(suit) ? -1 : 12;
    case 'A':
      return 0;
    case 'J':
    case 'Q':
      return 10;
    default:
      return parseInt(rank, 10);
  }
}

export function makeCard(rank: Rank, suit: Suit): Card {
  return { id: `${rank}${suit}`, rank, suit, value: cardValue(rank, suit) };
}

/** Standard 52-card deck, no jokers, in canonical (unshuffled) order. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(rank, suit));
    }
  }
  return deck;
}

export type Rng = () => number;

/** Deterministic seedable RNG (mulberry32) for reproducible games/tests. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle, in place. */
export function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}
