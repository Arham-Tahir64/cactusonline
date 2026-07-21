import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import type { Room } from 'colyseus.js';
import appConfig from './app.config.js';
import type { CactusGame, RoomView } from '../engine/index.js';

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
  views: RoomView[];
  lobbies: any[];
  events: any[];
  errors: any[];
  scores: any[];
  revealed: any[];
  view(): RoomView; // latest view
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

function roomEngine(room: unknown): CactusGame {
  return (room as { engine: CactusGame }).engine;
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

  it('assigns distinct curated avatars when players request the same one', async () => {
    const room = await server.createRoom('cactus', {});
    const alice = await server.connectTo(room, { name: 'Alice', avatarId: 'sage' });
    const aliceInbox = collect(alice);
    const bob = await server.connectTo(room, { name: 'Bob', avatarId: 'sage' });

    await until(() => aliceInbox.lobbies.at(-1)?.players.length === 2, 'two-player avatar lobby');
    expect(aliceInbox.lobbies.at(-1).players.map((p: any) => p.avatarId)).toEqual([
      'sage',
      'ranger',
    ]);
    await alice.leave();
    await bob.leave();
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
  it('sends reconnect-safe peek and match-window deadlines', async () => {
    const { alice, aliceInbox } = await twoPlayerRoom();
    const beforeStart = Date.now();
    alice.send('start');
    await until(() => aliceInbox.views.length > 0, 'peek view with deadline');
    expect(aliceInbox.view().peekEndsAtMs).toBeGreaterThan(beforeStart);
    expect(aliceInbox.view().serverNowMs).toBeGreaterThanOrEqual(beforeStart);

    await until(() => aliceInbox.view().phase === 'playing', 'playing phase');
    alice.send('draw-deck');
    await until(() => aliceInbox.view().turnStage === 'holding-drawn-card', 'drawn card');
    alice.send('discard-drawn');
    await until(() => aliceInbox.view().matchWindowEndsAtMs !== null, 'match deadline');
    expect(aliceInbox.view().matchWindowEndsAtMs).toBeGreaterThan(aliceInbox.view().serverNowMs);
  });

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

  it('processes a duplicated draw command once without leaking the held card', async () => {
    const { alice, aliceInbox, bobInbox } = await twoPlayerRoom();
    alice.send('start');
    await until(() => aliceInbox.views.length > 0 && aliceInbox.view().phase === 'playing', 'playing phase');

    alice.send('draw-deck');
    alice.send('draw-deck');
    await until(
      () => aliceInbox.view().turnStage === 'holding-drawn-card' && aliceInbox.errors.length > 0,
      'duplicate draw rejection',
    );
    expect(aliceInbox.errors.at(-1).code).toBe('wrong-stage');
    expect(aliceInbox.view().drawnCard).not.toBeNull();
    expect(bobInbox.view().drawnCard).toBeNull();
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

  it('resolves every action-card flow privately over the wire', async () => {
    const { room, alice, bob, aliceInbox, bobInbox } = await twoPlayerRoom();
    const clients = new Map([
      [alice.sessionId, { client: alice, inbox: aliceInbox, otherInbox: bobInbox }],
      [bob.sessionId, { client: bob, inbox: bobInbox, otherInbox: aliceInbox }],
    ]);
    const seen = new Set<string>();
    alice.send('start');
    await until(() => aliceInbox.views.length > 0 && aliceInbox.view().phase === 'playing', 'playing phase');

    for (let turn = 0; turn < 60 && seen.size < 4; turn++) {
      const currentId = aliceInbox.view().currentPlayerId;
      const actor = clients.get(currentId)!;
      actor.client.send('draw-deck');
      await until(() => actor.inbox.view().turnStage === 'holding-drawn-card', 'private draw');
      const rank = actor.inbox.view().drawnCard!.rank;
      const type = rank === '7' || rank === '8' ? '7-8' : rank === '9' || rank === '10' ? '9-10' : rank;

      if (!['7-8', '9-10', 'J', 'Q'].includes(type) || seen.has(type)) {
        actor.client.send('discard-drawn');
        await until(() => actor.inbox.view().currentPlayerId !== currentId, 'ordinary discard');
        continue;
      }

      actor.client.send('play-action');
      await until(() => actor.inbox.view().turnStage === 'resolving-action', `${type} pending`);
      const own = actor.inbox.view().players.find((p) => p.id === currentId)!;
      const opponent = actor.inbox.view().players.find((p) => p.id !== currentId)!;
      const revealedBefore = actor.inbox.revealed.length;
      const otherRevealedBefore = actor.otherInbox.revealed.length;

      if (type === '7-8') {
        actor.client.send('peek-own', { slotId: own.board[0]!.slotId });
      } else if (type === '9-10') {
        actor.client.send('peek-opponent', {
          target: { playerId: opponent.id, slotId: opponent.board[0]!.slotId },
        });
      } else if (type === 'J') {
        actor.client.send('jack-swap', {
          a: { playerId: own.id, slotId: own.board[0]!.slotId },
          b: { playerId: opponent.id, slotId: opponent.board[0]!.slotId },
        });
      } else {
        const looked = { playerId: opponent.id, slotId: opponent.board[0]!.slotId };
        actor.client.send('queen-look', { target: looked });
        await until(() => actor.inbox.revealed.length === revealedBefore + 1, 'private Queen reveal');
        expect(actor.otherInbox.revealed).toHaveLength(otherRevealedBefore);
        await until(() => actor.inbox.view().pendingAction?.stage === 'q-swap', 'Queen swap stage');
        expect(actor.inbox.view().pendingAction?.qLookTarget).toEqual(looked);
        expect(actor.otherInbox.view().pendingAction?.qLookTarget).toBeNull();
        actor.client.send('queen-swap', {
          target: { playerId: own.id, slotId: own.board[0]!.slotId },
        });
      }

      await until(() => actor.inbox.view().currentPlayerId !== currentId, `${type} complete`);
      if (type === '7-8' || type === '9-10') {
        expect(actor.inbox.revealed).toHaveLength(revealedBefore + 1);
        expect(actor.otherInbox.revealed).toHaveLength(otherRevealedBefore);
      }
      seen.add(type);
    }

    expect([...seen].sort()).toEqual(['7-8', '9-10', 'J', 'Q'].sort());
    expect(roomEngine(room).phase).toBe('playing');
  });

  it('deduplicates failed Stack messages and accepts only the first successful race', async () => {
    const { room, alice, bob, aliceInbox, bobInbox } = await twoPlayerRoom();
    const clients = new Map([
      [alice.sessionId, { client: alice, inbox: aliceInbox }],
      [bob.sessionId, { client: bob, inbox: bobInbox }],
    ]);
    alice.send('start');
    await until(() => aliceInbox.views.length > 0 && aliceInbox.view().phase === 'playing', 'playing phase');

    let testedDuplicate = false;
    let testedRace = false;
    for (let turn = 0; turn < 40 && (!testedDuplicate || !testedRace); turn++) {
      const currentId = aliceInbox.view().currentPlayerId;
      const actor = clients.get(currentId)!;
      actor.client.send('draw-deck');
      await until(() => actor.inbox.view().turnStage === 'holding-drawn-card', 'draw for Stack window');
      actor.client.send('discard-drawn');
      await until(() => actor.inbox.view().matchWindowOpen, 'open Stack window');

      const engine = roomEngine(room);
      const rank = engine.getState().matchWindow!.rank;
      const slots = engine.getState().players.flatMap((player) =>
        player.board.map((slot) => ({ playerId: player.id, slotId: slot.slotId, rank: slot.card.rank })),
      );

      if (!testedDuplicate) {
        const wrong = slots.find((slot) => slot.rank !== rank)!;
        const attacker = wrong.playerId === alice.sessionId ? bob : alice;
        const attackerState = engine.getPlayer(attacker.sessionId);
        const before = attackerState.board.length;
        const eventStart = attacker === alice ? aliceInbox.events.length : bobInbox.events.length;
        attacker.send('attempt-match', { target: wrong });
        await until(
          () => (attacker === alice ? aliceInbox : bobInbox).events.length > eventStart,
          'failed Stack event',
        );
        attacker.send('attempt-match', { target: wrong });
        await until(
          () => (attacker === alice ? aliceInbox : bobInbox).events.length > eventStart + 1,
          'duplicate Stack event',
        );
        const events = (attacker === alice ? aliceInbox : bobInbox).events.slice(eventStart);
        expect(events.map((event) => event.outcome)).toEqual(['incorrect', 'duplicate-attempt']);
        expect(attackerState.board).toHaveLength(before + 1);
        testedDuplicate = true;
      }

      const correct = slots.find((slot) => slot.rank === rank);
      if (correct) {
        const owner = clients.get(correct.playerId)!;
        const loser = correct.playerId === alice.sessionId ? bob : alice;
        const before = engine.getPlayer(correct.playerId).board.length;
        const eventStart = aliceInbox.events.length;
        owner.client.send('attempt-match', { target: correct });
        loser.send('attempt-match', { target: correct });
        await until(() => aliceInbox.events.length >= eventStart + 2, 'Stack race outcomes');
        expect(aliceInbox.events.slice(eventStart).map((event) => event.outcome)).toEqual([
          'correct-own',
          'window-closed',
        ]);
        expect(engine.getPlayer(correct.playerId).board).toHaveLength(before - 1);
        testedRace = true;
      }
    }

    expect(testedDuplicate).toBe(true);
    expect(testedRace).toBe(true);
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

  it('reconnects the same held seat with a fresh redacted view', async () => {
    const { alice, bob, aliceInbox, bobInbox } = await twoPlayerRoom();
    alice.send('start');
    await until(() => bobInbox.views.length > 0 && bobInbox.view().phase === 'playing', 'playing phase');

    const originalSessionId = bob.sessionId;
    const reconnectionToken = bob.reconnectionToken;
    await bob.leave(false);
    await until(
      () => aliceInbox.view().players.find((player) => player.id === originalSessionId)?.isConnected === false,
      'held disconnected seat',
    );

    const reconnected = await server.sdk.reconnect(reconnectionToken);
    const reconnectedInbox = collect(reconnected);
    await until(
      () => aliceInbox.view().players.find((player) => player.id === originalSessionId)?.isConnected === true,
      'seat reconnection',
    );
    await until(() => reconnectedInbox.views.length > 0, 'reconnected private view');

    expect(reconnected.sessionId).toBe(originalSessionId);
    expect(reconnectedInbox.view().peekCards).toBeNull();
    for (const player of reconnectedInbox.view().players) {
      for (const slot of player.board) expect(slot.card).toBeNull();
    }
  });

  it('hands rematch authority to a connected player when the host explicitly leaves', async () => {
    const room = await server.createRoom('cactus', { peekMs: 80, matchWindowMs: 120, seed: 42 });
    const alice = await server.connectTo(room, { name: 'Alice' });
    const bob = await server.connectTo(room, { name: 'Bob' });
    const carol = await server.connectTo(room, { name: 'Carol' });
    const aliceInbox = collect(alice);
    const bobInbox = collect(bob);
    const carolInbox = collect(carol);
    alice.send('start');
    await until(() => bobInbox.views.length > 0 && bobInbox.view().phase === 'playing', 'playing phase');

    alice.send('call-cactus');
    await until(() => bobInbox.view().phase === 'final-round', 'final round');
    bob.send('draw-deck');
    await until(() => bobInbox.view().turnStage === 'holding-drawn-card', 'Bob final draw');
    bob.send('discard-drawn');
    await until(() => carolInbox.view().currentPlayerId === carol.sessionId, 'Carol final turn');
    carol.send('draw-deck');
    await until(() => carolInbox.view().turnStage === 'holding-drawn-card', 'Carol final draw');
    carol.send('discard-drawn');
    await until(() => aliceInbox.view().phase === 'reveal', 'reveal before host departure');

    await alice.leave(true);
    await until(() => bobInbox.lobbies.at(-1)?.hostSessionId === bob.sessionId, 'host handoff');
    expect(bobInbox.lobbies.at(-1).hostSessionId).toBe(bob.sessionId);

    bob.send('rematch');
    await until(() => bobInbox.view().phase === 'peek', 'rematch');
    expect(bobInbox.view().players.map((player) => player.id).sort()).toEqual(
      [bob.sessionId, carol.sessionId].sort(),
    );
    for (const player of bobInbox.view().players) {
      for (const slot of player.board) expect(slot.card).toBeNull();
    }
  });
});
