import { useCactusStore } from '../store';
import { cardLabel, isRed } from '../cardLabel';

export default function CenterPile() {
  const view = useCactusStore((s) => s.view);
  if (!view) return null;
  const top = view.discardPile.at(-1) ?? null;

  return (
    <div className="center-pile">
      <div className="pile draw-pile">
        <div className="pile-card back" />
        <div className="pile-label">deck ({view.drawPileCount})</div>
      </div>
      <div className="pile discard-pile">
        <div className={`pile-card ${top ? (isRed(top) ? 'red' : '') : 'back'}`}>
          {top ? cardLabel(top) : ''}
        </div>
        <div className="pile-label">discard</div>
        {view.matchWindowOpen && <div className="match-window-badge">⏳ MATCH WINDOW</div>}
      </div>
    </div>
  );
}
