import { useState } from 'react';
import type { AvatarId } from '@engine/types';
import { useCactusStore } from '../store';
import { AVATARS } from '../avatars';

export default function JoinScreen() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('ranger');
  const createGame = useCactusStore((s) => s.createGame);
  const joinGame = useCactusStore((s) => s.joinGame);
  const connecting = useCactusStore((s) => s.connecting);
  const lastError = useCactusStore((s) => s.lastError);

  return (
    <section className="panel join-screen">
      <div className="panel-kicker">Gather around</div>
      <h2>Choose your player</h2>
      <p className="panel-intro">Pick a face, enter your name, then open a table or join your friends.</p>
      <div className="avatar-picker" role="radiogroup" aria-label="Choose a character">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            className={`avatar-choice ${avatarId === avatar.id ? 'selected' : ''}`}
            style={{ '--avatar-accent': avatar.accent } as React.CSSProperties}
            role="radio"
            aria-checked={avatarId === avatar.id}
            aria-label={avatar.name}
            onClick={() => setAvatarId(avatar.id)}
          >
            <img src={avatar.portrait} alt="" aria-hidden="true" />
          </button>
        ))}
      </div>
      <input
        className="name-input"
        placeholder="Your name"
        maxLength={20}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="join-actions">
        <button className="primary-action" disabled={connecting} onClick={() => createGame(name, avatarId)}>
          Create a table
        </button>
        <span className="or">or</span>
        <input
          className="code-input"
          placeholder="CAC-XXXX"
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button className="secondary-action" disabled={connecting || !code} onClick={() => joinGame(code, name, avatarId)}>
          Join table
        </button>
      </div>
      {lastError && <p className="error-text">{lastError}</p>}
    </section>
  );
}
