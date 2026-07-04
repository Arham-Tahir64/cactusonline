import { create } from 'zustand';
import type { Room } from 'colyseus.js';
import { client } from './colyseusClient';
import type { BoardTarget, Card, PlayerView, Scores } from '@engine/types';

export type ClickMode =
  | null
  | 'swap'
  | 'take-discard'
  | 'give'
  | 'stack'
  | 'peek-own'
  | 'peek-opponent'
  | 'jack-1'
  | 'jack-2'
  | 'q-look'
  | 'q-swap';

export interface LobbyPlayer {
  sessionId: string;
  name: string;
}

export interface LobbySettings {
  peekMs: number;
  matchWindowMs: number;
}

export interface LobbyMessage {
  roomId: string;
  players: LobbyPlayer[];
  hostSessionId: string;
  settings: LobbySettings;
}

export type GameEvent = { type: string } & Record<string, unknown>;

interface CactusState {
  screen: 'join' | 'lobby' | 'game';
  room: Room | null;
  lobby: LobbyMessage | null;
  view: PlayerView | null;
  events: GameEvent[];
  scores: Scores | null;
  /**
   * Transient private reveals from action-card looks (7/8/9/10, Q): slotId →
   * card, shown for a few seconds then flipped back. Cactus is a memory game —
   * nothing the server has revealed stays visible permanently.
   */
  reveals: Record<string, Card>;
  clickMode: ClickMode;
  jackFirst: BoardTarget | null;
  prompt: string;
  connecting: boolean;
  /** True while automatically re-establishing a dropped connection. */
  reconnecting: boolean;
  lastError: string | null;

  createGame(name: string): Promise<void>;
  joinGame(code: string, name: string): Promise<void>;
  resumeSession(): Promise<void>;
  leave(): void;
  send(type: string, payload?: unknown): void;
  setClickMode(mode: ClickMode, prompt?: string): void;
  handleSlotClick(playerId: string, slotId: string): void;
}

/** How long an action-card look stays face-up before flipping back (PRD §7:
    "brief timed reveal then flips back"). */
export const REVEAL_MS = 5_000;

// ---------------------------------------------------------------------------
// Session persistence — lets a player rejoin their seat after a refresh or
// connection drop, within the server's reconnection grace period (PRD §8).
// ---------------------------------------------------------------------------

const SESSION_KEY = 'cactus-session';
const NAME_KEY = 'cactus-name';

interface SavedSession {
  token: string;
  roomId: string;
}

function saveSession(room: Room) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token: room.reconnectionToken, roomId: room.roomId } satisfies SavedSession),
    );
  } catch {
    // Storage unavailable (private mode etc.) — reconnection just won't survive a refresh.
  }
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function savedPlayerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function savePlayerName(name: string) {
  try {
    if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
  } catch {
    /* ignore */
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function wireRoom(
  room: Room,
  set: (partial: Partial<CactusState>) => void,
  get: () => CactusState,
) {
  room.onMessage('lobby', (msg: LobbyMessage) => {
    // Once the game has actually started, a client shouldn't be bounced back to the lobby screen.
    set({ lobby: msg, screen: get().view ? 'game' : 'lobby' });
  });

  room.onMessage('view', (msg: PlayerView) => {
    // Peek cards render straight from the view: the server stops sending them
    // when the peek phase ends, so they flip back down on their own.
    set({ view: msg, screen: 'game' });
  });

  room.onMessage('revealed', (msg: { target: BoardTarget; card: Card }) => {
    const slotId = msg.target.slotId;
    set({
      reveals: { ...get().reveals, [slotId]: msg.card },
      events: [...get().events, { type: 'revealed', ...msg }],
    });
    setTimeout(() => {
      const { [slotId]: expired, ...rest } = get().reveals;
      if (expired) set({ reveals: rest });
    }, REVEAL_MS);
  });

  room.onMessage('kicked', () => {
    // The server closes our connection right after this with a normal code,
    // so no auto-reconnect fires — just reset to the join screen.
    clearSession();
    set({
      screen: 'join',
      room: null,
      lobby: null,
      view: null,
      events: [],
      scores: null,
      reveals: {},
      clickMode: null,
      jackFirst: null,
      prompt: '',
      lastError: 'You were removed from the lobby by the host.',
    });
  });

  room.onMessage('event', (e: GameEvent) => set({ events: [...get().events, e] }));
  room.onMessage('scores', (s: Scores) => set({ scores: s }));
  room.onMessage('error', (e: { code: string; message: string }) =>
    set({
      events: [...get().events, { type: 'error', ...e }],
      lastError: `${e.code}: ${e.message}`,
    }),
  );
  room.onLeave((code) => {
    // Code 1000 = consented leave (we called room.leave()); anything else is
    // an abnormal drop (network blip, server restart, phone lock) — try to
    // silently reclaim the held seat.
    if (code === 1000) return;
    set({ events: [...get().events, { type: 'disconnected' }] });
    void attemptReconnect(set, get);
  });
}

/**
 * Try to reclaim a held seat using the saved reconnection token. Retries with
 * backoff to ride out short outages; gives up (and clears the stale session)
 * once the server's grace period has clearly passed or the token is rejected.
 */
async function attemptReconnect(
  set: (partial: Partial<CactusState>) => void,
  get: () => CactusState,
  maxAttempts = 8,
): Promise<boolean> {
  const saved = loadSession();
  if (!saved) return false;
  set({ reconnecting: true, lastError: null });

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const room = await client.reconnect(saved.token);
      wireRoom(room, set, get);
      saveSession(room); // the token rotates on every successful reconnect
      set({
        room,
        reconnecting: false,
        events: [...get().events, { type: 'reconnected' }],
      });
      return true; // the server rebroadcasts our view right after restoring the seat
    } catch {
      // Backoff: 1s, 2s, 3s… caps well inside the 5-minute server grace window.
      await sleep(Math.min(1000 * (attempt + 1), 5000));
    }
  }

  clearSession();
  set({
    reconnecting: false,
    lastError: 'Could not reconnect to the game.',
    screen: 'join',
    room: null,
    view: null,
    lobby: null,
  });
  return false;
}

export const useCactusStore = create<CactusState>((set, get) => ({
  screen: 'join',
  room: null,
  lobby: null,
  view: null,
  events: [],
  scores: null,
  reveals: {},
  clickMode: null,
  jackFirst: null,
  prompt: '',
  connecting: false,
  reconnecting: false,
  lastError: null,

  async createGame(name) {
    set({ connecting: true, lastError: null });
    try {
      const room = await client.create('cactus', { name });
      wireRoom(room, set, get);
      saveSession(room);
      savePlayerName(name);
      set({ room, screen: 'lobby' });
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
    } finally {
      set({ connecting: false });
    }
  },

  async joinGame(code, name) {
    set({ connecting: true, lastError: null });
    try {
      const room = await client.joinById(code.trim().toUpperCase(), { name });
      wireRoom(room, set, get);
      saveSession(room);
      savePlayerName(name);
      set({ room, screen: 'lobby' });
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
    } finally {
      set({ connecting: false });
    }
  },

  async resumeSession() {
    // Called once on app boot: if a session survived a refresh/tab close,
    // reclaim the seat before showing the join screen.
    if (get().room || get().reconnecting) return;
    const saved = loadSession();
    if (!saved) return;
    // On boot the server is reachable, so a failure means the token is stale —
    // fail fast (2 attempts) instead of holding the player on a spinner.
    await attemptReconnect(set, get, 2);
  },

  leave() {
    clearSession();
    get().room?.leave(); // consented → onLeave fires with code 1000, no auto-reconnect
    set({
      screen: 'join',
      room: null,
      lobby: null,
      view: null,
      events: [],
      scores: null,
      reveals: {},
      clickMode: null,
      jackFirst: null,
      prompt: '',
      reconnecting: false,
    });
  },

  send(type, payload) {
    get().room?.send(type, payload);
  },

  setClickMode(mode, prompt = '') {
    set({ clickMode: mode, prompt, jackFirst: mode === 'jack-1' ? null : get().jackFirst });
  },

  handleSlotClick(playerId, slotId) {
    const { clickMode, room, jackFirst, send, setClickMode } = get();
    if (!room) return;
    const mine = playerId === room.sessionId;
    const target: BoardTarget = { playerId, slotId };

    switch (clickMode) {
      case 'swap':
        if (mine) {
          send('swap', { slotId });
          setClickMode(null);
        }
        break;
      case 'take-discard':
        if (mine) {
          send('draw-discard', { slotId });
          setClickMode(null);
        }
        break;
      case 'give':
        if (mine) {
          send('give', { slotId });
          setClickMode(null);
        }
        break;
      case 'stack':
        send('attempt-match', { target });
        setClickMode(null);
        break;
      case 'peek-own':
        if (mine) {
          send('peek-own', { slotId });
          setClickMode(null);
        }
        break;
      case 'peek-opponent':
        if (!mine) {
          send('peek-opponent', { target });
          setClickMode(null);
        }
        break;
      case 'jack-1':
        set({ jackFirst: target });
        setClickMode('jack-2', 'J: pick the second card to blind-swap');
        break;
      case 'jack-2':
        if (jackFirst) send('jack-swap', { a: jackFirst, b: target });
        setClickMode(null);
        break;
      case 'q-look':
        send('queen-look', { target });
        setClickMode('q-swap', 'Q: now pick a card to swap it with (mandatory)');
        break;
      case 'q-swap':
        send('queen-swap', { target });
        setClickMode(null);
        break;
      default:
        break;
    }
  },
}));
