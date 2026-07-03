import type { RedactedSlot } from '@engine/types';
import { useCactusStore } from '../store';
import { cardLabel, isRed } from '../cardLabel';

interface Props {
  playerId: string;
  slot: RedactedSlot;
}

export default function BoardSlot({ playerId, slot }: Props) {
  const room = useCactusStore((s) => s.room);
  const remembered = useCactusStore((s) => s.known[slot.slotId]);
  const clickMode = useCactusStore((s) => s.clickMode);
  const handleSlotClick = useCactusStore((s) => s.handleSlotClick);

  const mine = playerId === room?.sessionId;
  const visibleCard = slot.card ?? null;
  const displayCard = visibleCard ?? remembered ?? null;
  const selectable = clickMode !== null;

  const label = visibleCard ? cardLabel(visibleCard) : remembered ? `(${cardLabel(remembered)})` : '🂠';

  return (
    <button
      type="button"
      className={[
        'board-slot',
        isRed(displayCard) ? 'red' : '',
        selectable ? 'selectable' : '',
        slot.faceUp ? 'face-up' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={!selectable}
      onClick={() => handleSlotClick(playerId, slot.slotId)}
      title={mine ? 'your card' : 'opponent card'}
    >
      {label}
    </button>
  );
}
