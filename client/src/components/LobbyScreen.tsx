import { useCactusStore } from '../store';

export default function LobbyScreen() {
  const lobby = useCactusStore((s) => s.lobby);
  const room = useCactusStore((s) => s.room);
  const send = useCactusStore((s) => s.send);
  const leave = useCactusStore((s) => s.leave);

  if (!lobby || !room) return null;
  const isHost = lobby.hostSessionId === room.sessionId;

  return (
    <section className="panel lobby-screen">
      <h2>Lobby</h2>
      <p>
        Share this code: <strong className="room-code">{lobby.roomId}</strong>
      </p>
      <ul className="lobby-players">
        {lobby.players.map((p) => (
          <li key={p.sessionId}>
            {p.name}
            {p.sessionId === lobby.hostSessionId && ' (host)'}
            {p.sessionId === room.sessionId && ' — you'}
          </li>
        ))}
      </ul>
      {isHost ? (
        <button disabled={lobby.players.length < 2} onClick={() => send('start')}>
          Start game
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
