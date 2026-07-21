import { useCactusStore } from '../store';
import PlayingCard from './PlayingCard';

export default function CenterPile() {
  const view = useCactusStore((s) => s.view);
  const setClickMode = useCactusStore((s) => s.setClickMode);
  if (!view) return null;
  const top = view.discardPile.at(-1) ?? null;

  return (
    <div className="center-pile" role="group" aria-label="Table piles">
      <div className="pile draw-pile" role="group" aria-label={`Draw deck, ${view.drawPileCount} cards remaining`}>
        <PlayingCard faceDown size="md" />
        <span className="pile-count" aria-hidden="true">{view.drawPileCount}</span>
        <div className="pile-label">Draw deck</div>
      </div>
      <div className="pile discard-pile" role="group" aria-label="Discard pile">
        <PlayingCard card={top} size="md" />
        <div className="pile-label">discard</div>
        {view.matchWindowOpen && (
          <button
            type="button"
            className="stack-action center-stack-action"
            onClick={() => setClickMode('stack', 'STACK: click any card you think matches the discard')}
          >
            Stack!
          </button>
        )}
      </div>
    </div>
  );
}
