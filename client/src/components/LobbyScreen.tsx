import { useCactusStore } from '../store';
import { avatarById } from '../avatars';

export default function LobbyScreen() {
  const lobby = useCactusStore((s) => s.lobby);
  const room = useCactusStore((s) => s.room);
  const send = useCactusStore((s) => s.send);
  const leave = useCactusStore((s) => s.leave);

  if (!lobby || !room) return null;
  const isHost = lobby.hostSessionId === room.sessionId;

  return (
    <section className="panel lobby-screen">
      <div className="panel-kicker">Your table is ready</div>
      <h2>Waiting for players</h2>
      <button
        className="room-code-card"
        onClick={() => void navigator.clipboard?.writeText(lobby.roomId)}
        title="Copy room code"
      >
        <span>Room code</span>
        <strong className="room-code">{lobby.roomId}</strong>
        <span aria-hidden="true">▣</span>
      </button>
      <ul className="lobby-players">
        {lobby.players.map((p) => (
          <li key={p.sessionId}>
            <span className="lobby-avatar" style={{ '--avatar-accent': avatarById(p.avatarId).accent } as React.CSSProperties}>
              <img src={avatarById(p.avatarId).portrait} alt="" aria-hidden="true" />
            </span>
            <span className="lobby-player-name">
              <strong>{p.name}</strong>
              <small>{p.sessionId === room.sessionId ? 'You' : 'Ready'}</small>
            </span>
            {p.sessionId === lobby.hostSessionId && <span className="host-badge">Host</span>}
          </li>
        ))}
      </ul>
      {isHost ? (
        <button className="primary-action lobby-start" disabled={lobby.players.length < 2} onClick={() => send('start')}>
          Deal the cards
        </button>
      ) : (
        <p className="waiting-text">Waiting for the host to start…</p>
      )}
      <button className="leave-btn" onClick={leave}>
        Leave
      </button>
    </section>
  );
}
