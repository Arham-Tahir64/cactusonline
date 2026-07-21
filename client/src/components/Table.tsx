import { useCactusStore } from '../store';
import { rotatePlayersToLocal, seatsFor } from '../seating';
import PlayerBoard from './PlayerBoard';
import CenterPile from './CenterPile';

/**
 * "You" are always anchored at the bottom, so every client sees the table
 * from their own seat — per PRD §7.
 *
 * Seats use one consistent oval geometry for 2–8 players. The local player
 * remains at the bottom in every room size so memory and targeting positions
 * stay stable across the web and desktop clients.
 */
export default function Table() {
  const view = useCactusStore((s) => s.view);
  const room = useCactusStore((s) => s.room);
  if (!view || !room) return null;

  const me = room.sessionId;
  const seated = rotatePlayersToLocal(view.players, me);
  const n = seated.length;
  const layout = seatsFor(n);

  return (
    <div className="table table-circle" data-player-count={n}>
      <div className="table-center">
        <CenterPile />
      </div>
      {seated.map((player, i) => {
        const position = layout[i]!;
        return (
          <div
            key={player.id}
            className={`seat ${player.id === me ? 'local-seat' : 'opponent-seat'}`}
            data-seat-index={i}
            style={{ left: `${position.left}%`, top: `${position.top}%` }}
          >
            <PlayerBoard player={player} isMe={player.id === me} />
          </div>
        );
      })}
    </div>
  );
}
