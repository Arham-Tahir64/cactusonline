import { useCactusStore } from '../store';
import UiIcon from './UiIcon';

export default function TurnGuide() {
  const view = useCactusStore((state) => state.view);
  if (!view) return null;

  return (
    <aside className="turn-guide" aria-label="Turn guide">
      <header>
        <span className="turn-guide-kicker">How to play</span>
        <span className="turn-guide-chevron" aria-hidden="true">⌄</span>
      </header>

      <div className={`guide-step ${view.matchWindowOpen ? 'active' : ''}`}>
        <span className="guide-icon stack-ring" aria-hidden="true" />
        <div><strong>Stack!</strong><span>Match the discard before the window closes.</span></div>
      </div>
      <div className={`guide-step ${view.phase === 'final-round' ? 'active' : ''}`}>
        <span className="guide-icon cactus-icon" aria-hidden="true"><UiIcon name="cactus" /></span>
        <div><strong>Call Cactus</strong><span>End the round when you think your score is lowest.</span></div>
      </div>
      <div className="guide-step">
        <span className="guide-icon cards-icon" aria-hidden="true"><UiIcon name="clear" /></span>
        <div><strong>Clear your board</strong><span>Stack matching cards to shed them quickly.</span></div>
      </div>
    </aside>
  );
}
