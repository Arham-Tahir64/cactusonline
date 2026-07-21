import type { RedactedSlot } from '@engine/types';
import { useCactusStore } from '../store';
import { isValidTarget } from '../targeting';
import { visibleBoardCard } from '../cardVisibility';
import PlayingCard from './PlayingCard';

interface Props {
  playerId: string;
  slot: RedactedSlot;
}

export default function BoardSlot({ playerId, slot }: Props) {
  const room = useCactusStore((s) => s.room);
  const view = useCactusStore((s) => s.view);
  const clickMode = useCactusStore((s) => s.clickMode);
  const jackFirst = useCactusStore((s) => s.jackFirst);
  const qLookTarget = useCactusStore((s) => s.view?.pendingAction?.qLookTarget ?? null);
  const handleSlotClick = useCactusStore((s) => s.handleSlotClick);

  const mine = playerId === room?.sessionId;
  const visibleCard = view && room ? visibleBoardCard(view, room.sessionId, playerId, slot) : null;
  const target = { playerId, slotId: slot.slotId };
  const isChosenFirst = jackFirst?.playerId === playerId && jackFirst?.slotId === slot.slotId;
  const valid = isValidTarget(clickMode, mine, target, { jackFirst, qLookTarget });

  return (
    <button
      type="button"
      className={['board-slot', valid ? 'selectable' : '', isChosenFirst ? 'chosen' : '']
        .filter(Boolean)
        .join(' ')}
      disabled={!valid}
      onClick={() => handleSlotClick(playerId, slot.slotId)}
      title={mine ? 'your card' : 'opponent card'}
    >
      <PlayingCard
        card={visibleCard}
        faceDown={!visibleCard}
        size="sm"
      />
    </button>
  );
}
