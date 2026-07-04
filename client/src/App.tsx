import { useEffect } from 'react';
import { useCactusStore } from './store';
import JoinScreen from './components/JoinScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';

export default function App() {
  const screen = useCactusStore((s) => s.screen);
  const reconnecting = useCactusStore((s) => s.reconnecting);
  const resumeSession = useCactusStore((s) => s.resumeSession);

  // On boot, try to reclaim a seat held for us (refresh / dropped connection).
  useEffect(() => {
    void resumeSession();
  }, [resumeSession]);

  return (
    <div className="app">
      <h1 className="app-title">🌵 Cactus</h1>
      {reconnecting && (
        <div className="reconnect-overlay">
          <div className="reconnect-box">
            <span className="reconnect-spinner" />
            Reconnecting to your game…
          </div>
        </div>
      )}
      {screen === 'join' && <JoinScreen />}
      {screen === 'lobby' && <LobbyScreen />}
      {screen === 'game' && <GameScreen />}
    </div>
  );
}
