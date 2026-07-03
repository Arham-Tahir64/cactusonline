import { useCactusStore } from '../store';
import PlayerBoard from './PlayerBoard';
import CenterPile from './CenterPile';

/**
 * Oval seating: "you" are always anchored at the bottom (angle = 90°), with
 * the rest of the table distributed clockwise around an ellipse — so every
 * client sees their own perspective the same way, per PRD §7.
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
    <div className="table">
      <div className="table-center">
        <CenterPile />
      </div>
      {seated.map((player, i) => {
        const angle = Math.PI / 2 + (2 * Math.PI * i) / n;
        const left = 50 + 42 * Math.cos(angle);
        const top = 50 + 38 * Math.sin(angle);
        return (
          <div key={player.id} className="seat" style={{ left: `${left}%`, top: `${top}%` }}>
            <PlayerBoard player={player} isMe={player.id === me} />
          </div>
        );
      })}
    </div>
  );
}
