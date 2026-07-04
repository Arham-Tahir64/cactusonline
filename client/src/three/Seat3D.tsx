import { Html } from '@react-three/drei';
import type { RedactedPlayer, RedactedSlot } from '@engine/types';
import { useCactusStore } from '../store';
import { isValidTarget } from '../targeting';
import { seatTransform, slotLocalPosition, BOTTOM_ROW_Z, CARD_H, CARD_W } from './layout';
import Card3D from './Card3D';

interface Props {
  player: RedactedPlayer;
  seatIndex: number;
  seatCount: number;
  isMe: boolean;
}

export default function Seat3D({ player, seatIndex, seatCount, isMe }: Props) {
  const isCurrent = useCactusStore((s) => s.view?.currentPlayerId === player.id);
  const t = seatTransform(seatIndex, seatCount);

  // Opponents' tags sit behind their (anchored) bottom row; yours sits beside
  // your board so it neither leaves the frame nor collides with board growth.
  const tagPos: [number, number, number] = isMe
    ? [-(CARD_W + 1.15), 0.05, BOTTOM_ROW_Z]
    : [0, 0.05, BOTTOM_ROW_Z + CARD_H * 0.95];

  return (
    <group position={t.position} rotation={[0, t.rotationY, 0]}>
      {player.board.map((slot, i) => (
        <BoardCard3D
          key={slot.slotId}
          playerId={player.id}
          slot={slot}
          index={i}
          count={player.board.length}
        />
      ))}
      <Html position={tagPos} center distanceFactor={11} zIndexRange={[10, 0]}>
        <div className={`seat-tag ${isCurrent ? 'current' : ''} ${isMe ? 'me' : ''}`}>
          {player.name}
          {isMe && ' (you)'}
          {!player.isConnected && ' 📴'}
          {player.hasCalledCactus && ' 🌵'}
        </div>
      </Html>
    </group>
  );
}

/** One board slot — same visibility and targeting rules as the 2D BoardSlot. */
function BoardCard3D({
  playerId,
  slot,
  index,
  count,
}: {
  playerId: string;
  slot: RedactedSlot;
  index: number;
  count: number;
}) {
  // Private reveals are transient: peek phase (straight off the view) and
  // timed action-card looks. Otherwise only server-confirmed face-up cards.
  const peeked = useCactusStore(
    (s) => s.view?.peekCards?.find((p) => p.slotId === slot.slotId)?.card ?? null,
  );
  const revealed = useCactusStore((s) => s.reveals[slot.slotId] ?? null);
  const room = useCactusStore((s) => s.room);
  const clickMode = useCactusStore((s) => s.clickMode);
  const jackFirst = useCactusStore((s) => s.jackFirst);
  const qLookTarget = useCactusStore((s) => s.view?.pendingAction?.qLookTarget ?? null);
  const handleSlotClick = useCactusStore((s) => s.handleSlotClick);

  const mine = playerId === room?.sessionId;
  const target = { playerId, slotId: slot.slotId };
  const valid = isValidTarget(clickMode, mine, target, { jackFirst, qLookTarget });
  const isChosenFirst = jackFirst?.playerId === playerId && jackFirst?.slotId === slot.slotId;

  const display = slot.card ?? peeked ?? revealed;
  return (
    <Card3D
      card={display}
      faceDown={!display}
      position={slotLocalPosition(index, count)}
      selectable={valid}
      chosen={isChosenFirst}
      onClick={() => handleSlotClick(playerId, slot.slotId)}
    />
  );
}
