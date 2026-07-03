import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import type { Room } from 'colyseus.js';
import appConfig from './app.config.js';
import type { PlayerView } from '../engine/index.js';

let server: ColyseusTestServer;

beforeAll(async () => {
  server = await boot(appConfig);
});
afterAll(async () => {
  await server.shutdown();
});
beforeEach(async () => {
  await server.cleanup();
});

interface Inbox {
  views: PlayerView[];
  lobbies: any[];
  events: any[];
  errors: any[];
  scores: any[];
  revealed: any[];
  view(): PlayerView; // latest view
}

function collect(client: Room): Inbox {
  const inbox: Inbox = {
    views: [],
    lobbies: [],
    events: [],
    errors: [],
    scores: [],
    revealed: [],
    view() {
      const latest = this.views.at(-1);
      if (!latest) throw new Error('no view received yet');
      return latest;
    },
  };
  client.onMessage('view', (v) => inbox.views.push(v));
  client.onMessage('lobby', (m) => inbox.lobbies.push(m));
  client.onMessage('event', (m) => inbox.events.push(m));
  client.onMessage('error', (m) => inbox.errors.push(m));
  client.onMessage('scores', (m) => inbox.scores.push(m));
  client.onMessage('revealed', (m) => inbox.revealed.push(m));
  return inbox;
}

async function until(predicate: () => boolean, what = 'condition', timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 15));
  }
}

/** Boot a room with fast timers and connect two named clients. */
async function twoPlayerRoom() {
  const room = await server.createRoom('cactus', { peekMs: 80, matchWindowMs: 120, seed: 42 });
  const alice = await server.connectTo(room, { name: 'Alice' });
  const bob = await server.connectTo(room, { name: 'Bob' });
  const aliceInbox = collect(alice);
  const bobInbox = collect(bob);
  return { room, alice, bob, aliceInbox, bobInbox };
}

describe('lobby', () => {
  it('assigns a CAC- room code and broadcasts joins with the first player as host', async () => {
    const { room, alice, bob, bobInbox } = await twoPlayerRoom();
    expect(room.roomId).toMatch(/^CAC-[A-Z2-9]{4}$/);

    await until(() => bobInbox.lobbies.length > 0, 'lobby broadcast');
    const lobby = bobInbox.lobbies.at(-1);
    expect(lobby.players.map((p: any) => p.name)).toEqual(['Alice', 'Bob']);
    expect(lobby.hostSessionId).toBe(alice.sessionId);
    expect(lobby.roomId).toBe(room.roomId);
    void bob;
  });

  it('only the host can start, and 2+ players are required', async () => {
    const room = await server.createRoom('cactus', { peekMs: 80 });
    const alice = await server.connectTo(room, { name: 'Alice' });
    const aliceInbox = collect(alice);

    alice.send('start');
    await until(() => aliceInbox.errors.length > 0, 'not-enough-players error');
    expect(aliceInbox.errors.at(-1).code).toBe('not-enough-players');

    const bob = await server.connectTo(room, { name: 'Bob' });
    const bobInbox = collect(bob);
    bob.send('start');
    await until(() => bobInbox.errors.length > 0, 'not-host error');
    expect(bobInbox.errors.at(-1).code).toBe('not-host');
  });
});

describe('game start & redaction', () => {
  it('deals into peek phase; clients see their own peek cards and zero face-down faces', async () => {
    const { alice, aliceInbox, bobInbox } = await twoPlayerRoom();
    alice.send('start');

    await until(() => aliceInbox.views.length > 0 && bobInbox.views.length > 0, 'initial views');
    const aliceView = aliceInbox.view();
    const bobView = bobInbox.view();

    expect(aliceView.phase).toBe('peek');
    expect(aliceView.peekCards).toHaveLength(2);
    expect(bobView.peekCards).toHaveLength(2);
    // Peek cards are your own bottom row — never someone else's.
    expect(aliceView.peekCards!.map((p) => p.slotId).every((id) =>
      aliceView.players.find((pl) => pl.id === alice.sessionId)!.board.some((s) => s.slotId === id),
    )).toBe(true);

    // The wire payload contains no card faces for any face-down slot, for anyone.
    for (const view of [aliceView, bobView]) {
      for (const player of view.players) {
        for (const slot of player.board) {
          expect(slot.card).toBeNull();
        }
      }
      expect(view.drawPileCount).toBe(52 - 8 - 1);
      expect(view.discardPile).toHaveLength(1);
    }

    // Peek phase auto-ends on the server timer.
    await until(() => aliceInbox.view().phase === 'playing', 'peek timer to fire');
    expect(aliceInbox.view().peekCards).toBeNull();
  });

  it('a drawn card is visible only to the player who drew it', async () => {
    const { alice, aliceInbox, bobInbox } = await twoPlayerRoom();
    alice.send('start');
    await until(() => aliceInbox.views.length > 0 && aliceInbox.view().phase === 'playing', 'playing phase');

    expect(aliceInbox.view().currentPlayerId).toBe(alice.sessionId); // join order = turn order
    alice.send('draw-deck');
    await until(() => aliceInbox.view().turnStage === 'holding-drawn-card', 'draw to resolve');

    expect(aliceInbox.view().drawnCard).not.toBeNull();
    await until(() => bobInbox.view().turnStage === 'holding-drawn-card', 'bob view update');
    expect(bobInbox.view().drawnCard).toBeNull();
  });
});

describe('turn taking & match window', () => {
  it('discarding advances the turn and opens a match window that times out', async () => {
    const { alice, bob, aliceInbox, bobInbox } = await twoPlayerRoom();
    alice.send('start');
    await until(() => aliceInbox.views.length > 0 && aliceInbox.view().phase === 'playing', 'playing phase');

    alice.send('draw-deck');
    await until(() => aliceInbox.view().turnStage === 'holding-drawn-card', 'draw');
    alice.send('discard-drawn');

    await until(() => bobInbox.view().currentPlayerId === bob.sessionId, 'turn to advance');
    expect(bobInbox.view().matchWindowOpen).toBe(true);
    expect(bobInbox.view().discardPile).toHaveLength(2);

    // The room's timer closes the window without any client input.
    await until(() => bobInbox.view().matchWindowOpen === false, 'window timeout');
    expect(bobInbox.events.some((e) => e.type === 'match-window-closed')).toBe(true);
  });

  it('rejects out-of-turn actions with an error, state unchanged', async () => {
    const { alice, bob, aliceInbox, bobInbox } = await twoPlayerRoom();
    alice.send('start');
    await until(() => bobInbox.views.length > 0 && bobInbox.view().phase === 'playing', 'playing phase');

    bob.send('draw-deck');
    await until(() => bobInbox.errors.length > 0, 'not-your-turn error');
    expect(bobInbox.errors.at(-1).code).toBe('not-your-turn');
    expect(aliceInbox.view().currentPlayerId).toBe(alice.sessionId);
  });

  it('plays through a full 2-player cactus round over the wire', async () => {
    const { alice, bob, aliceInbox, bobInbox } = await twoPlayerRoom();
    alice.send('start');
    await until(() => aliceInbox.views.length > 0 && aliceInbox.view().phase === 'playing', 'playing phase');

    alice.send('call-cactus');
    await until(() => bobInbox.view().phase === 'final-round', 'final round');
    expect(bobInbox.view().cactusCallerId).toBe(alice.sessionId);

    bob.send('draw-deck');
    await until(() => bobInbox.view().turnStage === 'holding-drawn-card', 'bob draw');
    bob.send('discard-drawn');

    // Final discard keeps its match window; reveal comes after the timeout.
    await until(() => aliceInbox.view().phase === 'reveal', 'reveal');
    await until(() => aliceInbox.scores.length > 0 && bobInbox.scores.length > 0, 'scores');

    const scores = aliceInbox.scores.at(-1);
    expect(Object.keys(scores.totals).sort()).toEqual([alice.sessionId, bob.sessionId].sort());
    expect(scores.winnerIds.length).toBeGreaterThan(0);

    // Reveal: every card face is now public in every view.
    for (const player of bobInbox.view().players) {
      for (const slot of player.board) expect(slot.card).not.toBeNull();
    }
  });
});

describe('disconnection', () => {
  it('marks a mid-game leaver as disconnected but holds their seat', async () => {
    const { alice, bob, aliceInbox, bobInbox } = await twoPlayerRoom();
    alice.send('start');
    await until(() => bobInbox.views.length > 0 && bobInbox.view().phase === 'playing', 'playing phase');

    await bob.leave(false); // simulate a dropped connection
    await until(
      () => aliceInbox.view().players.find((p) => p.id === bob.sessionId)?.isConnected === false,
      'disconnect flag',
    );
    const bobSeat = aliceInbox.view().players.find((p) => p.id === bob.sessionId)!;
    expect(bobSeat.board.length).toBe(4); // seat and board are held
  });
});
