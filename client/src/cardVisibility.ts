import type { Card, PlayerView, RedactedSlot } from '../../src/engine/types';

export function visibleBoardCard(
  view: Pick<PlayerView, 'phase' | 'peekCards'>,
  viewerId: string,
  ownerId: string,
  slot: RedactedSlot,
): Card | null {
  if (slot.card) return slot.card;
  if (view.phase !== 'peek' || viewerId !== ownerId) return null;
  return view.peekCards?.find((peek) => peek.slotId === slot.slotId)?.card ?? null;
}
