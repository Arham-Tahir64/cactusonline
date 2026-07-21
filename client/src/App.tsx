import { useEffect } from 'react';
import { useCactusStore } from './store';
import JoinScreen from './components/JoinScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';
import { usePreferences } from './preferences';

export default function App() {
  const screen = useCactusStore((s) => s.screen);
  const restoring = useCactusStore((s) => s.restoring);
  const restoreGame = useCactusStore((s) => s.restoreGame);
  const reducedMotion = usePreferences((s) => s.reducedMotion);

  useEffect(() => {
    void restoreGame();
  }, [restoreGame]);

  return (
    <div className="app" data-screen={screen} data-reduced-motion={reducedMotion}>
      {screen !== 'game' && (
        <header className="landing-brand" aria-label="Cactus">
          <span className="brand-cactus" aria-hidden="true">🌵</span>
          <h1 className="app-title">Cactus</h1>
          <span className="brand-cactus" aria-hidden="true">🌵</span>
          <p>Cards, memory &amp; a little desert mischief</p>
        </header>
      )}
      {restoring ? (
        <section className="panel reconnecting-panel" aria-live="polite">
          <div className="panel-kicker">Returning to the table</div>
          <h2>Restoring your seat…</h2>
          <p className="panel-intro">Reconnecting securely and requesting a fresh hidden-card view.</p>
        </section>
      ) : (
        <>
          {screen === 'join' && <JoinScreen />}
          {screen === 'lobby' && <LobbyScreen />}
          {screen === 'game' && <GameScreen />}
        </>
      )}
    </div>
  );
}
