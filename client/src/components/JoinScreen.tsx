import { useState } from 'react';
import type { AvatarId } from '@engine/types';
import { useCactusStore } from '../store';
import { AVATARS } from '../avatars';
import { packagedServerEndpoint } from '../colyseusClient';
import { displayServerEndpoint } from '../endpoint';
import { readServerEndpoint } from '../serverEndpoint';

export default function JoinScreen() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('ranger');
  const isDesktop = location.protocol === 'cactus:';
  const [serverInput, setServerInput] = useState(() =>
    displayServerEndpoint(readServerEndpoint() || packagedServerEndpoint),
  );
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
      {isDesktop && (
        <label className="server-link-field">
          <span>Server link</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://your-link.trycloudflare.com"
            value={serverInput}
            onChange={(event) => setServerInput(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <small>Paste the newest Cloudflare link from the host.</small>
        </label>
      )}
      <div className="join-actions">
        <button
          className="primary-action"
          disabled={connecting || (isDesktop && !serverInput.trim())}
          onClick={() => createGame(name, avatarId, isDesktop ? serverInput : undefined)}
        >
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
        <button
          className="secondary-action"
          disabled={connecting || !code || (isDesktop && !serverInput.trim())}
          onClick={() => joinGame(code, name, avatarId, isDesktop ? serverInput : undefined)}
        >
          Join table
        </button>
      </div>
      {lastError && <p className="error-text">{lastError}</p>}
    </section>
  );
}
