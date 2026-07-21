import { describe, expect, it } from 'vitest';
import type { Card, RedactedSlot } from '../../src/engine/types';
import { visibleBoardCard } from './cardVisibility';

const card: Card = { id: '7D', rank: '7', suit: 'D', value: 7 };
const hidden: RedactedSlot = { slotId: 'p1:s2', faceUp: false, card: null };

describe('visibleBoardCard', () => {
  it('shows an own peek card only during the peek phase', () => {
    expect(
      visibleBoardCard(
        { phase: 'peek', peekCards: [{ slotId: hidden.slotId, card }] },
        'p1',
        'p1',
        hidden,
      ),
    ).toEqual(card);

    expect(
      visibleBoardCard(
        { phase: 'playing', peekCards: null },
        'p1',
        'p1',
        hidden,
      ),
    ).toBeNull();
  });

  it('never shows another player peek data and always shows server-confirmed face-up cards', () => {
    expect(
      visibleBoardCard(
        { phase: 'peek', peekCards: [{ slotId: hidden.slotId, card }] },
        'p1',
        'p2',
        hidden,
      ),
    ).toBeNull();
    expect(
      visibleBoardCard(
        { phase: 'reveal', peekCards: null },
        'p1',
        'p2',
        { ...hidden, faceUp: true, card },
      ),
    ).toEqual(card);
  });
});
