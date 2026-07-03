import { useState } from 'react';
import { useCactusStore } from '../store';

export default function JoinScreen() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const createGame = useCactusStore((s) => s.createGame);
  const joinGame = useCactusStore((s) => s.joinGame);
  const connecting = useCactusStore((s) => s.connecting);
  const lastError = useCactusStore((s) => s.lastError);

  return (
    <section className="panel join-screen">
      <h2>Join a game</h2>
      <input
        className="name-input"
        placeholder="your name"
        maxLength={20}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="join-actions">
        <button disabled={connecting} onClick={() => createGame(name)}>
          Create game
        </button>
        <span className="or">or</span>
        <input
          className="code-input"
          placeholder="CAC-XXXX"
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button disabled={connecting || !code} onClick={() => joinGame(code, name)}>
          Join game
        </button>
      </div>
      {lastError && <p className="error-text">{lastError}</p>}
    </section>
  );
}
