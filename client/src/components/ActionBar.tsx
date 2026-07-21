import { useCactusStore } from '../store';
import { FORCED_MODES } from '../targeting';
import PlayingCard from './PlayingCard';

const ACTION_RANKS = new Set(['7', '8', '9', '10', 'J', 'Q']);

export default function ActionBar({ myTurn }: { myTurn: boolean }) {
  const view = useCactusStore((s) => s.view);
  const send = useCactusStore((s) => s.send);
  const setClickMode = useCactusStore((s) => s.setClickMode);
  const clickMode = useCactusStore((s) => s.clickMode);
  const prompt = useCactusStore((s) => s.prompt);

  if (!view) return null;

  const canAct =
    myTurn &&
    view.turnStage === 'awaiting-draw' &&
    (view.phase === 'playing' || view.phase === 'final-round') &&
    !view.pendingGive;

  const holding = myTurn && view.turnStage === 'holding-drawn-card' && view.drawnCard;

  return (
    <div className="action-bar">
      {prompt && <div className="prompt-banner">{prompt}</div>}

      {!holding && (
        <div className="turn-actions">
          <button className="draw-action" disabled={!canAct} onClick={() => send('draw-deck')}>
            <span aria-hidden="true">▱</span> Draw deck
          </button>
          <button
            className="discard-action"
            disabled={!canAct}
            onClick={() =>
              setClickMode(
                'take-discard',
                'Taking discard: click one of YOUR slots to swap it into (committed!)',
              )
            }
          >
            <span aria-hidden="true">⇧</span> Take discard
          </button>
          <button
            className="cactus-action"
            disabled={!canAct || view.phase !== 'playing'}
            onClick={() => {
              if (confirm('Call Cactus? This starts the final round and cannot be undone.')) {
                send('call-cactus');
              }
            }}
          >
            <span aria-hidden="true">🌵</span> Call Cactus
          </button>
        </div>
      )}

      {holding && view.drawnCard && (
        <div className="drawn-panel">
          <div className="drawn-card-display">
            <PlayingCard card={view.drawnCard} size="md" />
            <span className="drawn-card-caption">drawn</span>
          </div>
          <button
            onClick={() => setClickMode('swap', 'Click one of YOUR slots to swap the drawn card into')}
          >
            Swap into a slot…
          </button>
          <button onClick={() => send('discard-drawn')}>Discard it</button>
          <button disabled={!ACTION_RANKS.has(view.drawnCard.rank)} onClick={() => send('play-action')}>
            Play action
          </button>
        </div>
      )}

      {clickMode && !FORCED_MODES.has(clickMode) && (
        <button className="cancel-btn" onClick={() => setClickMode(null)}>
          Cancel
        </button>
      )}
    </div>
  );
}
