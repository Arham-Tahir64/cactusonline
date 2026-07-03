import { useCactusStore } from './store';
import JoinScreen from './components/JoinScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';

export default function App() {
  const screen = useCactusStore((s) => s.screen);

  return (
    <div className="app">
      <h1 className="app-title">🌵 Cactus</h1>
      {screen === 'join' && <JoinScreen />}
      {screen === 'lobby' && <LobbyScreen />}
      {screen === 'game' && <GameScreen />}
    </div>
  );
}
