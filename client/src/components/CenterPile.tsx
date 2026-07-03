import { useCactusStore } from '../store';
import PlayingCard from './PlayingCard';

export default function CenterPile() {
  const view = useCactusStore((s) => s.view);
  if (!view) return null;
  const top = view.discardPile.at(-1) ?? null;

  return (
    <div className="center-pile">
      <div className="pile draw-pile">
        <PlayingCard faceDown size="md" />
        <div className="pile-label">deck ({view.drawPileCount})</div>
      </div>
      <div className="pile discard-pile">
        <PlayingCard card={top} size="md" />
        <div className="pile-label">discard</div>
        {view.matchWindowOpen && <div className="match-window-badge">⏳ MATCH WINDOW</div>}
      </div>
    </div>
  );
}
