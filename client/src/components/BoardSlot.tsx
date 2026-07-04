import { motion } from 'framer-motion';
import type { RedactedSlot } from '@engine/types';
import { useCactusStore } from '../store';
import { isValidTarget } from '../targeting';
import PlayingCard from './PlayingCard';

interface Props {
  playerId: string;
  slot: RedactedSlot;
}

export default function BoardSlot({ playerId, slot }: Props) {
  const room = useCactusStore((s) => s.room);
  // Private reveals are transient: your own bottom row during the peek phase
  // (straight off the view — the server stops sending it when peek ends), and
  // action-card looks for a few seconds. After that, players must remember.
  const peeked = useCactusStore(
    (s) => s.view?.peekCards?.find((p) => p.slotId === slot.slotId)?.card ?? null,
  );
  const revealed = useCactusStore((s) => s.reveals[slot.slotId] ?? null);
  const clickMode = useCactusStore((s) => s.clickMode);
  const jackFirst = useCactusStore((s) => s.jackFirst);
  const qLookTarget = useCactusStore((s) => s.view?.pendingAction?.qLookTarget ?? null);
  const handleSlotClick = useCactusStore((s) => s.handleSlotClick);

  const mine = playerId === room?.sessionId;
  const visibleCard = slot.card ?? null;
  const target = { playerId, slotId: slot.slotId };
  const isChosenFirst = jackFirst?.playerId === playerId && jackFirst?.slotId === slot.slotId;
  const valid = isValidTarget(clickMode, mine, target, { jackFirst, qLookTarget });

  const privateReveal = peeked ?? revealed;
  const displayCard = visibleCard ?? privateReveal;
  const isPrivateReveal = !visibleCard && !!privateReveal;

  return (
    <motion.button
      type="button"
      layout
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      className={['board-slot', valid ? 'selectable' : '', isChosenFirst ? 'chosen' : '']
        .filter(Boolean)
        .join(' ')}
      disabled={!valid}
      onClick={() => handleSlotClick(playerId, slot.slotId)}
      title={mine ? 'your card' : 'opponent card'}
    >
      <PlayingCard
        card={displayCard}
        faceDown={!displayCard}
        size="sm"
        className={isPrivateReveal ? 'private-reveal' : ''}
      />
    </motion.button>
  );
}
