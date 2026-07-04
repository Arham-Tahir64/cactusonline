import { useCactusStore } from '../store';

const PEEK_OPTIONS_S = [5, 10, 15, 20, 30];
const MATCH_WINDOW_OPTIONS_S = [3, 4, 5, 6, 8, 10, 15];

export default function LobbyScreen() {
  const lobby = useCactusStore((s) => s.lobby);
  const room = useCactusStore((s) => s.room);
  const send = useCactusStore((s) => s.send);
  const leave = useCactusStore((s) => s.leave);

  if (!lobby || !room) return null;
  const isHost = lobby.hostSessionId === room.sessionId;
  const settings = lobby.settings ?? { peekMs: 10_000, matchWindowMs: 5_000 };

  return (
    <section className="panel lobby-screen">
      <h2>Lobby</h2>
      <p>
        Share this code: <strong className="room-code">{lobby.roomId}</strong>
      </p>
      <ul className="lobby-players">
        {lobby.players.map((p) => (
          <li key={p.sessionId}>
            <span>
              {p.name}
              {p.sessionId === lobby.hostSessionId && ' (host)'}
              {p.sessionId === room.sessionId && ' — you'}
            </span>
            {isHost && p.sessionId !== room.sessionId && (
              <button
                className="kick-btn"
                title={`Remove ${p.name} from the lobby`}
                onClick={() => send('kick', { sessionId: p.sessionId })}
              >
                kick
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="lobby-rules">
        <h3>Rules</h3>
        <label className="rule-row">
          <span>Peek phase</span>
          {isHost ? (
            <select
              value={settings.peekMs}
              onChange={(e) => send('config', { peekMs: Number(e.target.value) })}
            >
              {PEEK_OPTIONS_S.map((s) => (
                <option key={s} value={s * 1000}>
                  {s}s
                </option>
              ))}
            </select>
          ) : (
            <strong>{settings.peekMs / 1000}s</strong>
          )}
        </label>
        <label className="rule-row">
          <span>Stack window</span>
          {isHost ? (
            <select
              value={settings.matchWindowMs}
              onChange={(e) => send('config', { matchWindowMs: Number(e.target.value) })}
            >
              {MATCH_WINDOW_OPTIONS_S.map((s) => (
                <option key={s} value={s * 1000}>
                  {s}s
                </option>
              ))}
            </select>
          ) : (
            <strong>{settings.matchWindowMs / 1000}s</strong>
          )}
        </label>
      </div>

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
