import { useCactusStore } from './store';
import JoinScreen from './components/JoinScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';

export default function App() {
  const screen = useCactusStore((s) => s.screen);

  return (
    <div className="app" data-screen={screen}>
      {screen !== 'game' && (
        <header className="landing-brand" aria-label="Cactus">
          <span className="brand-cactus" aria-hidden="true">🌵</span>
          <h1 className="app-title">Cactus</h1>
          <span className="brand-cactus" aria-hidden="true">🌵</span>
          <p>Cards, memory &amp; a little desert mischief</p>
        </header>
      )}
      {screen === 'join' && <JoinScreen />}
      {screen === 'lobby' && <LobbyScreen />}
      {screen === 'game' && <GameScreen />}
    </div>
  );
}
