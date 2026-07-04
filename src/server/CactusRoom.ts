import { Room, type Client } from 'colyseus';
import { CactusGame, GameError, type BoardTarget, type Card } from '../engine/index.js';

interface JoinOptions {
  name?: string;
}

interface CreateOptions {
  /** Peek phase duration in ms (default 10s). */
  peekMs?: number;
  /** Match window duration in ms (default 5s). */
  matchWindowMs?: number;
  /** Seed for deterministic shuffles (tests only). */
  seed?: number;
}

interface LobbyPlayer {
  sessionId: string;
  name: string;
}

const ROOM_CODE_CHANNEL = 'cactus:roomcodes';
const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const RECONNECT_GRACE_SECONDS = 300; // 5 minutes, per PRD §8

// Host-configurable rule bounds (PRD §6 phase 6: lobby rule config).
const PEEK_MS_MIN = 3_000;
const PEEK_MS_MAX = 30_000;
const MATCH_WINDOW_MS_MIN = 2_000;
const MATCH_WINDOW_MS_MAX = 15_000;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

/**
 * Authoritative game room. The engine holds canonical state; every client
 * only ever receives their own redacted `PlayerView` (message type "view").
 *
 * Client → server messages:
 *   start | draw-deck | draw-discard {slotId} | swap {slotId} | discard-drawn
 *   play-action | peek-own {slotId} | peek-opponent {target} | jack-swap {a,b}
 *   queen-look {target} | queen-swap {target} | call-cactus
 *   attempt-match {target} | give {slotId} | rematch
 *   config {peekMs?, matchWindowMs?} | kick {sessionId}     (host, lobby only)
 *
 * Server → client messages:
 *   lobby {roomId, players, hostSessionId, settings}
 *   kicked                             — sent to a player removed by the host
 *   view  (redacted PlayerView, sent individually after every mutation)
 *   revealed {target, card}            — private action-card look results
 *   event {type, ...}                  — public game events (stacks, cactus…)
 *   scores {totals, winnerIds}         — at reveal
 *   error {code, message}
 */
export class CactusRoom extends Room {
  maxClients = 8;

  private engine: CactusGame | null = null;
  private lobby: LobbyPlayer[] = [];
  private hostSessionId = '';
  private peekMs = 10_000;
  private matchWindowMs = 5_000;
  private seed: number | undefined;

  async onCreate(options: CreateOptions = {}) {
    this.roomId = await this.generateRoomCode();
    if (typeof options.peekMs === 'number') this.peekMs = options.peekMs;
    if (typeof options.matchWindowMs === 'number') this.matchWindowMs = options.matchWindowMs;
    if (typeof options.seed === 'number') this.seed = options.seed;

    this.onMessage('start', (client) => this.handle(client, () => this.startGame(client)));

    this.onMessage('draw-deck', (client) =>
      this.handle(client, () => {
        this.game().drawFromDeck(client.sessionId);
      }),
    );
    this.onMessage('draw-discard', (client, msg: { slotId: string }) =>
      this.handle(client, () => this.game().drawFromDiscard(client.sessionId, msg.slotId)),
    );
    this.onMessage('swap', (client, msg: { slotId: string }) =>
      this.handle(client, () => this.game().swapDrawnCard(client.sessionId, msg.slotId)),
    );
    this.onMessage('discard-drawn', (client) =>
      this.handle(client, () => this.game().discardDrawnCard(client.sessionId)),
    );
    this.onMessage('play-action', (client) =>
      this.handle(client, () => {
        const type = this.game().playDrawnActionCard(client.sessionId);
        this.broadcast('event', { type: 'action-played', playerId: client.sessionId, action: type });
      }),
    );
    this.onMessage('peek-own', (client, msg: { slotId: string }) =>
      this.handle(client, () => {
        const card = this.game().resolvePeekOwn(client.sessionId, msg.slotId);
        this.sendRevealed(client, { playerId: client.sessionId, slotId: msg.slotId }, card);
      }),
    );
    this.onMessage('peek-opponent', (client, msg: { target: BoardTarget }) =>
      this.handle(client, () => {
        const card = this.game().resolvePeekOpponent(client.sessionId, msg.target);
        this.sendRevealed(client, msg.target, card);
      }),
    );
    this.onMessage('jack-swap', (client, msg: { a: BoardTarget; b: BoardTarget }) =>
      this.handle(client, () => this.game().resolveJackSwap(client.sessionId, msg.a, msg.b)),
    );
    this.onMessage('queen-look', (client, msg: { target: BoardTarget }) =>
      this.handle(client, () => {
        const card = this.game().resolveQueenLook(client.sessionId, msg.target);
        this.sendRevealed(client, msg.target, card);
      }),
    );
    this.onMessage('queen-swap', (client, msg: { target: BoardTarget }) =>
      this.handle(client, () => this.game().resolveQueenSwap(client.sessionId, msg.target)),
    );
    this.onMessage('call-cactus', (client) =>
      this.handle(client, () => {
        this.game().callCactus(client.sessionId);
        this.broadcast('event', { type: 'cactus-called', playerId: client.sessionId });
      }),
    );
    this.onMessage('attempt-match', (client, msg: { target: BoardTarget }) =>
      this.handle(client, () => {
        const result = this.game().attemptMatch(client.sessionId, msg.target);
        // Stack outcomes are public: correct stacks land face-up, and a failed
        // attempt momentarily reveals the misplayed card to the whole table.
        this.broadcast('event', {
          type: 'match-attempt',
          playerId: client.sessionId,
          target: msg.target,
          outcome: result.outcome,
          card: result.outcome === 'window-closed' ? null : result.card,
        });
      }),
    );
    this.onMessage('give', (client, msg: { slotId: string }) =>
      this.handle(client, () => this.game().giveCard(client.sessionId, msg.slotId)),
    );
    this.onMessage('rematch', (client) => this.handle(client, () => this.rematch(client)));

    this.onMessage('config', (client, msg: { peekMs?: number; matchWindowMs?: number }) =>
      this.handle(client, () => this.configure(client, msg)),
    );
    this.onMessage('kick', (client, msg: { sessionId: string }) =>
      this.handle(client, () => this.kick(client, msg.sessionId)),
    );
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    if (this.engine) {
      throw new Error('Game already in progress — spectators are not supported yet.');
    }
    const name = (options.name ?? '').trim().slice(0, 20) || `Player ${this.lobby.length + 1}`;
    this.lobby.push({ sessionId: client.sessionId, name });
    if (!this.hostSessionId) this.hostSessionId = client.sessionId;
    this.broadcastLobby();
  }

  async onLeave(client: Client, consented: boolean) {
    if (!this.engine) {
      // Still in the lobby: drop the seat; pass host to the next player.
      this.lobby = this.lobby.filter((p) => p.sessionId !== client.sessionId);
      if (this.hostSessionId === client.sessionId) {
        this.hostSessionId = this.lobby[0]?.sessionId ?? '';
      }
      this.broadcastLobby();
      return;
    }

    // Mid-game: hold the seat and allow rejoining within the grace period.
    this.engine.setConnected(client.sessionId, false);
    this.broadcastViews();
    if (consented) return; // explicit leave: seat stays held, but don't wait
    try {
      await this.allowReconnection(client, RECONNECT_GRACE_SECONDS);
      this.engine.setConnected(client.sessionId, true);
      this.broadcastViews();
    } catch {
      // Grace period expired; seat remains marked disconnected.
    }
  }

  async onDispose() {
    await this.presence.srem(ROOM_CODE_CHANNEL, this.roomId);
  }

  // -------------------------------------------------------------------------

  private game(): CactusGame {
    if (!this.engine) throw new GameError('not-started', 'The game has not started yet.');
    return this.engine;
  }

  /** Run a mutation, then rebroadcast views and manage timers; errors go back to the sender only. */
  private handle(client: Client, mutation: () => void) {
    try {
      mutation();
    } catch (error) {
      const code = error instanceof GameError ? error.code : 'internal';
      const message = error instanceof Error ? error.message : String(error);
      client.send('error', { code, message });
      return;
    }
    this.afterMutation();
  }

  private startGame(client: Client) {
    if (this.engine) throw new GameError('already-started', 'Game already started.');
    if (client.sessionId !== this.hostSessionId) {
      throw new GameError('not-host', 'Only the host can start the game.');
    }
    if (this.lobby.length < 2) {
      throw new GameError('not-enough-players', 'Need at least 2 players.');
    }
    this.lock(); // no more joins once cards are dealt
    this.engine = new CactusGame(
      this.lobby.map((p) => ({ id: p.sessionId, name: p.name })),
      this.seed !== undefined ? { seed: this.seed } : {},
    );
    this.broadcast('event', { type: 'game-started', peekMs: this.peekMs });
    this.clock.setTimeout(() => {
      if (this.engine?.phase === 'peek') {
        this.engine.startPlaying();
        this.broadcast('event', { type: 'peek-ended' });
        this.broadcastViews();
      }
    }, this.peekMs);
  }

  private configure(client: Client, msg: { peekMs?: number; matchWindowMs?: number }) {
    if (client.sessionId !== this.hostSessionId) {
      throw new GameError('not-host', 'Only the host can change the rules.');
    }
    if (this.engine) {
      throw new GameError('already-started', 'Rules can only be changed in the lobby.');
    }
    if (typeof msg.peekMs === 'number' && Number.isFinite(msg.peekMs)) {
      this.peekMs = clamp(msg.peekMs, PEEK_MS_MIN, PEEK_MS_MAX);
    }
    if (typeof msg.matchWindowMs === 'number' && Number.isFinite(msg.matchWindowMs)) {
      this.matchWindowMs = clamp(msg.matchWindowMs, MATCH_WINDOW_MS_MIN, MATCH_WINDOW_MS_MAX);
    }
    this.broadcastLobby();
  }

  private kick(client: Client, sessionId: string) {
    if (client.sessionId !== this.hostSessionId) {
      throw new GameError('not-host', 'Only the host can kick players.');
    }
    if (this.engine) {
      throw new GameError('already-started', 'Players can only be kicked in the lobby.');
    }
    if (sessionId === this.hostSessionId) {
      throw new GameError('bad-target', 'The host cannot kick themselves.');
    }
    const target = this.clients.find((c) => c.sessionId === sessionId);
    if (!target) throw new GameError('bad-target', 'That player is not in the lobby.');
    // Tell the kicked client first (so it resets its UI instead of trying to
    // reconnect), then close with a normal code; onLeave drops the seat.
    target.send('kicked', {});
    target.leave(1000);
  }

  private rematch(client: Client) {
    if (client.sessionId !== this.hostSessionId) {
      throw new GameError('not-host', 'Only the host can start a rematch.');
    }
    if (!this.engine || this.engine.phase !== 'reveal') {
      throw new GameError('wrong-phase', 'A rematch can only start from the results screen.');
    }
    this.engine.endGame();
    this.engine = null;
    this.broadcast('event', { type: 'rematch' });
    this.startGame(client); // fresh shuffle, same lobby
  }

  /** After every successful mutation: sync views, drive the match-window timer, emit scores. */
  private afterMutation() {
    const engine = this.engine;
    if (!engine) {
      this.broadcastLobby();
      return;
    }
    this.broadcastViews();

    const window = engine.getState().matchWindow;
    if (window?.open) {
      const eventId = window.discardEventId;
      this.clock.setTimeout(() => {
        const current = this.engine?.getState().matchWindow;
        if (this.engine && current?.discardEventId === eventId && current.open) {
          this.engine.closeMatchWindow();
          this.broadcast('event', { type: 'match-window-closed', discardEventId: eventId });
          this.afterMutation(); // may fire the final reveal → scores broadcast
        }
      }, this.matchWindowMs);
    }

    if (engine.phase === 'reveal') {
      this.broadcast('scores', engine.getScores());
    }
  }

  private broadcastViews() {
    const engine = this.engine;
    if (!engine) return;
    for (const client of this.clients) {
      try {
        client.send('view', engine.getPlayerView(client.sessionId));
      } catch {
        // Client not part of this game (shouldn't happen; room is locked).
      }
    }
  }

  private broadcastLobby() {
    this.broadcast('lobby', {
      roomId: this.roomId,
      players: this.lobby.map((p) => ({ sessionId: p.sessionId, name: p.name })),
      hostSessionId: this.hostSessionId,
      settings: { peekMs: this.peekMs, matchWindowMs: this.matchWindowMs },
    });
  }

  private sendRevealed(client: Client, target: BoardTarget, card: Card) {
    client.send('revealed', { target, card });
  }

  /** Short shareable room code, e.g. CAC-7XQ2, unique across the process/presence. */
  private async generateRoomCode(): Promise<string> {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = 'CAC-';
      for (let i = 0; i < 4; i++) {
        code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
      }
      const taken = await this.presence.sismember(ROOM_CODE_CHANNEL, code);
      if (!taken) {
        await this.presence.sadd(ROOM_CODE_CHANNEL, code);
        return code;
      }
    }
    throw new Error('Could not allocate a unique room code.');
  }
}
