import { useCactusStore } from '../store';
import PlayerBoard from './PlayerBoard';
import CenterPile from './CenterPile';

/**
 * "You" are always anchored at the bottom, so every client sees the table
 * from their own seat — per PRD §7.
 *
 * 2 players is by far the common case and a plain circle wastes the two
 * unused side positions as empty space (and crowds the center pile between
 * the two boards); it gets a simple linear stack instead. 3+ players use
 * an oval layout distributed clockwise around the table.
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

  if (n <= 2) {
    const [mine, opponent] = seated;
    return (
      <div className="table table-linear">
        {opponent && <PlayerBoard player={opponent} isMe={false} />}
        <CenterPile />
        {mine && <PlayerBoard player={mine} isMe />}
      </div>
    );
  }

  return (
    <div className="table table-circle">
      <div className="table-center">
        <CenterPile />
      </div>
      {seated.map((player, i) => {
        const angle = Math.PI / 2 + (2 * Math.PI * i) / n;
        const left = 50 + 40 * Math.cos(angle);
        const top = 50 + 36 * Math.sin(angle);
        return (
          <div key={player.id} className="seat" style={{ left: `${left}%`, top: `${top}%` }}>
            <PlayerBoard player={player} isMe={player.id === me} />
          </div>
        );
      })}
    </div>
  );
}
