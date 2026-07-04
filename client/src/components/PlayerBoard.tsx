import { AnimatePresence } from 'framer-motion';
import type { RedactedPlayer } from '@engine/types';
import { useCactusStore } from '../store';
import BoardSlot from './BoardSlot';

interface Props {
  player: RedactedPlayer;
  isMe: boolean;
}

export default function PlayerBoard({ player, isMe }: Props) {
  const isCurrent = useCactusStore((s) => s.view?.currentPlayerId === player.id);

  return (
    <div className={`player-board ${isMe ? 'me' : ''} ${isCurrent ? 'current' : ''}`}>
      <div className="player-name">
        {player.name}
        {isMe && ' (you)'}
        {!player.isConnected && ' 📴'}
        {player.hasCalledCactus && ' 🌵'}
      </div>
      <div className="board-grid">
        <AnimatePresence initial={false}>
          {player.board.map((slot) => (
            <BoardSlot key={slot.slotId} playerId={player.id} slot={slot} />
          ))}
        </AnimatePresence>
        {player.board.length === 0 && <span className="empty-board">(empty)</span>}
      </div>
    </div>
  );
}
