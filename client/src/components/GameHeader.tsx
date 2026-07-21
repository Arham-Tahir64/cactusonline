import { useState } from 'react';
import { useCactusStore } from '../store';
import { usePreferences } from '../preferences';

export default function GameHeader() {
  const room = useCactusStore((state) => state.room);
  const view = useCactusStore((state) => state.view);
  const leave = useCactusStore((state) => state.leave);
  const muted = usePreferences((state) => state.muted);
  const volume = usePreferences((state) => state.volume);
  const reducedMotion = usePreferences((state) => state.reducedMotion);
  const setMuted = usePreferences((state) => state.setMuted);
  const setVolume = usePreferences((state) => state.setVolume);
  const setReducedMotion = usePreferences((state) => state.setReducedMotion);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!room || !view) return null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <header className="game-hud">
        <div className="hud-left">
          <button className="hud-icon menu-button" onClick={leave} aria-label="Leave game" title="Leave game">
            <span aria-hidden="true">☰</span>
          </button>
          <div className="player-count" title="Players at this table">
            <span aria-hidden="true">♟</span>
            <strong>{view.players.length}</strong>
          </div>
        </div>

        <div className="game-brand">
          <div><span aria-hidden="true">🌵</span><strong>Cactus</strong><span aria-hidden="true">🌵</span></div>
          <button className="hud-room-code" onClick={() => void copyCode()}>
            {copied ? 'Copied!' : room.roomId}
            <span aria-hidden="true">▣</span>
          </button>
        </div>

        <div className="hud-right">
          <button className="hud-icon" onClick={() => setHelpOpen(true)} aria-label="How to play">?</button>
          <button className="hud-icon" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>
            <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
          </button>
          <button className="hud-icon" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </header>

      {helpOpen && (
        <div className="modal-scrim" role="presentation" onMouseDown={() => setHelpOpen(false)}>
          <section className="utility-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setHelpOpen(false)} aria-label="Close rules">×</button>
            <div className="panel-kicker">Quick guide</div>
            <h2 id="rules-title">How to play Cactus</h2>
            <ol className="rules-list">
              <li><strong>Memorize.</strong> Peek at your bottom two cards before they turn face-down.</li>
              <li><strong>Draw or take.</strong> Swap cards to make the lowest-scoring board you can.</li>
              <li><strong>Stack fast.</strong> When a matching rank is discarded, click the matching board card.</li>
              <li><strong>Call Cactus.</strong> End the round when you believe your score is lowest.</li>
            </ol>
            <p className="rules-note">Ace is 0. Red kings are −1. Lowest total wins.</p>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-scrim" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
          <section className="utility-modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button>
            <div className="panel-kicker">At your table</div>
            <h2 id="settings-title">Settings</h2>
            <label className="setting-row">
              <span>Sound effects</span>
              <input type="checkbox" checked={!muted} onChange={(event) => setMuted(!event.target.checked)} />
            </label>
            <label className="setting-row volume-row">
              <span>Volume</span>
              <input type="range" min="0" max="1" step="0.05" value={volume} disabled={muted} onChange={(event) => setVolume(Number(event.target.value))} />
            </label>
            <label className="setting-row">
              <span>Reduce motion</span>
              <input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} />
            </label>
          </section>
        </div>
      )}
    </>
  );
}
