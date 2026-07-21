import { Room, type Client } from 'colyseus';
import {
  AVATAR_IDS,
  CactusGame,
  GameError,
  isAvatarId,
  type AvatarId,
  type BoardTarget,
  type Card,
} from '../engine/index.js';

interface JoinOptions {
  name?: string;
  avatarId?: string;
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
  avatarId: AvatarId;
}

const ROOM_CODE_CHANNEL = 'cactus:roomcodes';
const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const RECONNECT_GRACE_SECONDS = 300; // 5 minutes, per PRD §8

/**
 * Authoritative game room. The engine holds canonical state; every client
 * only ever receives their own redacted `PlayerView` (message type "view").
 *
 * Client → server messages:
 *   start | draw-deck | draw-discard {slotId} | swap {slotId} | discard-drawn
 *   play-action | peek-own {slotId} | peek-opponent {target} | jack-swap {a,b}
 *   queen-look {target} | queen-swap {target} | call-cactus
 *   attempt-match {target} | give {slotId} | rematch
 *
 * Server → client messages:
 *   lobby {roomId, players, hostSessionId}
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
  private peekEndsAtMs: number | null = null;
  private matchWindowEndsAtMs: number | null = null;
  private timedDiscardEventId: string | null = null;

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
          card:
            result.outcome === 'window-closed' || result.outcome === 'duplicate-attempt'
              ? null
              : result.card,
        });
      }),
    );
    this.onMessage('give', (client, msg: { slotId: string }) =>
      this.handle(client, () => this.game().giveCard(client.sessionId, msg.slotId)),
    );
    this.onMessage('rematch', (client) => this.handle(client, () => this.rematch(client)));
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    if (this.engine) {
      throw new Error('Game already in progress — spectators are not supported yet.');
    }
    const name = (options.name ?? '').trim().slice(0, 20) || `Player ${this.lobby.length + 1}`;
    if (options.avatarId !== undefined && !isAvatarId(options.avatarId)) {
      throw new Error('Unknown avatar selection.');
    }
    const requested = options.avatarId as AvatarId | undefined;
    const used = new Set(this.lobby.map((player) => player.avatarId));
    const avatarId =
      (requested && !used.has(requested) ? requested : AVATAR_IDS.find((id) => !used.has(id))) ??
      requested ??
      AVATAR_IDS[this.lobby.length % AVATAR_IDS.length]!;
    this.lobby.push({ sessionId: client.sessionId, name, avatarId });
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
    if (consented) {
      // An explicit departure must not strand rematch authority on an absent host.
      this.transferHostFrom(client.sessionId);
      return; // seat stays held, but don't wait
    }
    try {
      await this.allowReconnection(client, RECONNECT_GRACE_SECONDS);
      this.engine.setConnected(client.sessionId, true);
      this.broadcastViews();
      if (this.engine.phase === 'reveal') client.send('scores', this.engine.getScores());
    } catch {
      // Grace period expired; seat remains marked disconnected.
      this.transferHostFrom(client.sessionId);
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
      this.lobby.map((p) => ({ id: p.sessionId, name: p.name, avatarId: p.avatarId })),
      this.seed !== undefined ? { seed: this.seed } : {},
    );
    this.peekEndsAtMs = Date.now() + this.peekMs;
    this.broadcast('event', { type: 'game-started', peekMs: this.peekMs });
    this.clock.setTimeout(() => {
      if (this.engine?.phase === 'peek') {
        this.engine.startPlaying();
        this.peekEndsAtMs = null;
        this.broadcast('event', { type: 'peek-ended' });
        this.broadcastViews();
      }
    }, this.peekMs);
  }

  private rematch(client: Client) {
    if (client.sessionId !== this.hostSessionId) {
      throw new GameError('not-host', 'Only the host can start a rematch.');
    }
    if (!this.engine || this.engine.phase !== 'reveal') {
      throw new GameError('wrong-phase', 'A rematch can only start from the results screen.');
    }
    const connectedIds = new Set(
      this.engine.getState().players.filter((player) => player.isConnected).map((player) => player.id),
    );
    const nextLobby = this.lobby.filter((player) => connectedIds.has(player.sessionId));
    if (nextLobby.length < 2) {
      throw new GameError('not-enough-players', 'Need at least 2 connected players for a rematch.');
    }
    this.engine.endGame();
    this.engine = null;
    this.lobby = nextLobby;
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
    const window = engine.getState().matchWindow;
    if (window?.open) {
      const eventId = window.discardEventId;
      if (this.timedDiscardEventId !== eventId) {
        this.timedDiscardEventId = eventId;
        this.matchWindowEndsAtMs = Date.now() + this.matchWindowMs;
        this.clock.setTimeout(() => {
          const current = this.engine?.getState().matchWindow;
          if (this.engine && current?.discardEventId === eventId && current.open) {
            this.engine.closeMatchWindow();
            this.broadcast('event', { type: 'match-window-closed', discardEventId: eventId });
            this.afterMutation(); // may fire the final reveal → scores broadcast
          }
        }, this.matchWindowMs);
      }
    } else {
      this.timedDiscardEventId = null;
      this.matchWindowEndsAtMs = null;
    }

    this.broadcastViews();

    if (engine.phase === 'reveal') {
      this.broadcast('scores', engine.getScores());
    }
  }

  private broadcastViews() {
    const engine = this.engine;
    if (!engine) return;
    for (const client of this.clients) {
      try {
        client.send('view', {
          ...engine.getPlayerView(client.sessionId),
          serverNowMs: Date.now(),
          peekEndsAtMs: this.peekEndsAtMs,
          matchWindowEndsAtMs: this.matchWindowEndsAtMs,
        });
      } catch {
        // Client not part of this game (shouldn't happen; room is locked).
      }
    }
  }

  private broadcastLobby() {
    this.broadcast('lobby', {
      roomId: this.roomId,
      players: this.lobby.map((p) => ({
        sessionId: p.sessionId,
        name: p.name,
        avatarId: p.avatarId,
      })),
      hostSessionId: this.hostSessionId,
    });
  }

  private transferHostFrom(sessionId: string) {
    if (this.hostSessionId !== sessionId) return;
    this.hostSessionId =
      this.lobby.find(
        (player) =>
          player.sessionId !== sessionId &&
          (!this.engine || this.engine.getPlayer(player.sessionId).isConnected),
      )?.sessionId ?? '';
    this.broadcastLobby();
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
