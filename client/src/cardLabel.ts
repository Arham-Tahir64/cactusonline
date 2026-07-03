import type { Card } from '@engine/types';

const SUIT_SYMBOLS: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS = new Set(['H', 'D']);

export function cardLabel(card: Card | null | undefined): string {
  if (!card) return '';
  return `${card.rank}${SUIT_SYMBOLS[card.suit] ?? card.suit}`;
}

export function isRed(card: Card | null | undefined): boolean {
  return !!card && RED_SUITS.has(card.suit);
}
