import { useCactusStore } from '../store';
import { nameOf } from '../names';

export default function Scoreboard() {
  const scores = useCactusStore((s) => s.scores);
  const view = useCactusStore((s) => s.view);
  const send = useCactusStore((s) => s.send);

  if (!scores || !view) return null;

  const ranked = Object.entries(scores.totals).sort((a, b) => a[1] - b[1]);

  return (
    <div className="scoreboard panel">
      <h2>Results</h2>
      <ul>
        {ranked.map(([id, total]) => (
          <li key={id} className={scores.winnerIds.includes(id) ? 'winner' : ''}>
            {nameOf(view, id)}: {total}
            {scores.winnerIds.includes(id) && ' 🏆'}
          </li>
        ))}
      </ul>
      <button onClick={() => send('rematch')}>Rematch</button>
    </div>
  );
}
