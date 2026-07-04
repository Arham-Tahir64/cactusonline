import { Html } from '@react-three/drei';
import type { RedactedPlayer, RedactedSlot } from '@engine/types';
import { useCactusStore } from '../store';
import { seatTransform, slotLocalPosition, CARD_H } from './layout';
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

  const rows = Math.max(1, Math.ceil(player.board.length / 2));
  // Opponents' tags sit behind their board (away from center); yours sits on
  // the center side so it isn't pushed out of the camera frame.
  const tagZ = (((rows - 1) / 2) * (CARD_H + 0.14) + CARD_H * 0.95) * (isMe ? -1 : 1);

  return (
    <group position={t.position} rotation={[0, t.rotationY, 0]}>
      {player.board.map((slot, i) => (
        <BoardCard3D
          key={slot.slotId}
          slot={slot}
          index={i}
          count={player.board.length}
        />
      ))}
      <Html position={[0, 0.05, tagZ]} center distanceFactor={11} zIndexRange={[10, 0]}>
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

/** One board slot — same visibility rules as the 2D BoardSlot. */
function BoardCard3D({ slot, index, count }: { slot: RedactedSlot; index: number; count: number }) {
  // Private reveals are transient: peek phase (straight off the view) and
  // timed action-card looks. Otherwise only server-confirmed face-up cards.
  const peeked = useCactusStore(
    (s) => s.view?.peekCards?.find((p) => p.slotId === slot.slotId)?.card ?? null,
  );
  const revealed = useCactusStore((s) => s.reveals[slot.slotId] ?? null);

  const display = slot.card ?? peeked ?? revealed;
  return (
    <Card3D card={display} faceDown={!display} position={slotLocalPosition(index, count)} />
  );
}
