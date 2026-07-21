import { useCactusStore } from '../store';
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
  const myIndex = view.players.findIndex((p) => p.id === me);
  const seated =
    myIndex === -1 ? view.players : [...view.players.slice(myIndex), ...view.players.slice(0, myIndex)];
  const n = seated.length;

  return (
    <div className="table table-circle" data-player-count={n}>
      <div className="table-center">
        <CenterPile />
      </div>
      {seated.map((player, i) => {
        const angle = Math.PI / 2 + (2 * Math.PI * i) / n;
        const left = 50 + 43 * Math.cos(angle);
        const top = 50 + 36 * Math.sin(angle);
        return (
          <div
            key={player.id}
            className={`seat ${player.id === me ? 'local-seat' : 'opponent-seat'}`}
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <PlayerBoard player={player} isMe={player.id === me} />
          </div>
        );
      })}
    </div>
  );
}
