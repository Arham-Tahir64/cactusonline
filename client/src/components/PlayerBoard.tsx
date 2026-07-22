import type { RedactedPlayer } from '@engine/types';
import { useCactusStore } from '../store';
import { avatarById } from '../avatars';
import BoardSlot from './BoardSlot';
import UiIcon from './UiIcon';

interface Props {
  player: RedactedPlayer;
  isMe: boolean;
}

export default function PlayerBoard({ player, isMe }: Props) {
  const isCurrent = useCactusStore((s) => s.view?.currentPlayerId === player.id);
  const avatar = avatarById(player.avatarId);

  return (
    <div
      className={`player-board ${isMe ? 'me' : ''} ${isCurrent ? 'current' : ''}`}
      style={{ '--avatar-accent': avatar.accent } as React.CSSProperties}
    >
      <div className="seat-avatar" aria-hidden="true">
        <img src={avatar.cutout} alt="" />
      </div>
      <div className="player-nameplate">
        <span className="player-status-mark" aria-hidden="true"><UiIcon name={isMe ? 'crown' : 'sparkle'} /></span>
        <strong>{isMe ? 'You' : player.name}</strong>
        <span className="cactus-score" title={`${player.board.length} cards`}>
          <UiIcon name="cactus" /> {player.board.length}
        </span>
      </div>
      {(!player.isConnected || player.hasCalledCactus) && (
        <div className="seat-status">
          {!player.isConnected && <span>Disconnected</span>}
          {player.hasCalledCactus && <span>🌵 Cactus called</span>}
        </div>
      )}
      <div className="board-grid">
        {player.board.map((slot) => (
          <BoardSlot key={slot.slotId} playerId={player.id} slot={slot} />
        ))}
        {player.board.length === 0 && <span className="empty-board">Clear board!</span>}
      </div>
    </div>
  );
}
