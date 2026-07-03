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

export interface LobbyMessage {
  roomId: string;
  players: LobbyPlayer[];
  hostSessionId: string;
}

export type GameEvent = { type: string } & Record<string, unknown>;

interface CactusState {
  screen: 'join' | 'lobby' | 'game';
  room: Room | null;
  lobby: LobbyMessage | null;
  view: PlayerView | null;
  events: GameEvent[];
  scores: Scores | null;
  /** Local-only memory of card faces this client has been shown (peeks, action looks). */
  known: Record<string, Card>;
  clickMode: ClickMode;
  jackFirst: BoardTarget | null;
  prompt: string;
  connecting: boolean;
  lastError: string | null;

  createGame(name: string): Promise<void>;
  joinGame(code: string, name: string): Promise<void>;
  leave(): void;
  send(type: string, payload?: unknown): void;
  setClickMode(mode: ClickMode, prompt?: string): void;
  handleSlotClick(playerId: string, slotId: string): void;
}

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
    const known = { ...get().known };
    if (msg.peekCards) {
      for (const p of msg.peekCards) known[p.slotId] = p.card;
    }
    set({ view: msg, screen: 'game', known });
  });

  room.onMessage('revealed', (msg: { target: BoardTarget; card: Card }) => {
    set({
      known: { ...get().known, [msg.target.slotId]: msg.card },
      events: [...get().events, { type: 'revealed', ...msg }],
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
  room.onLeave(() => set({ events: [...get().events, { type: 'disconnected' }] }));
}

export const useCactusStore = create<CactusState>((set, get) => ({
  screen: 'join',
  room: null,
  lobby: null,
  view: null,
  events: [],
  scores: null,
  known: {},
  clickMode: null,
  jackFirst: null,
  prompt: '',
  connecting: false,
  lastError: null,

  async createGame(name) {
    set({ connecting: true, lastError: null });
    try {
      const room = await client.create('cactus', { name });
      wireRoom(room, set, get);
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
      set({ room, screen: 'lobby' });
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
    } finally {
      set({ connecting: false });
    }
  },

  leave() {
    get().room?.leave();
    set({
      screen: 'join',
      room: null,
      lobby: null,
      view: null,
      events: [],
      scores: null,
      known: {},
      clickMode: null,
      jackFirst: null,
      prompt: '',
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
