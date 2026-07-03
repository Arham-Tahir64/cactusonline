/**
 * Console harness: plays a full game of Cactus with simple simulated players.
 *
 *   npm run simulate            # random seed
 *   npm run simulate -- 42      # fixed seed for a reproducible game
 *
 * Bots use naive memory: they remember their two peeked cards and anything an
 * action card shows them, attempt stacks when they know a matching rank, and
 * call Cactus once they believe their total is low.
 */
import { CactusGame, type BoardTarget, type Card, type Rank } from '../engine/index.js';

const seed = Number(process.argv[2] ?? Math.floor(Math.random() * 1e9));
console.log(`=== Cactus simulation (seed ${seed}) ===\n`);

const names = ['Alice', 'Bob', 'Carol', 'Dave'];
const players = names.map((name, i) => ({ id: `p${i + 1}`, name }));
const game = new CactusGame(players, { seed });

function label(card: Card): string {
  const suits: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
  return `${card.rank}${suits[card.suit]}(${card.value})`;
}

// Per-bot memory of card ranks by slotId (their own beliefs, like KnownCardMemory).
const memory = new Map<string, Map<string, Rank>>(players.map((p) => [p.id, new Map()]));

function forget(slotId: string): void {
  for (const mem of memory.values()) mem.delete(slotId);
}

// Peek phase: everyone memorizes their bottom two cards.
for (const p of players) {
  const peeked = game.getPeekCards(p.id);
  for (const { slotId, card } of peeked) memory.get(p.id)!.set(slotId, card.rank);
  console.log(`${p.name} peeks: ${peeked.map((x) => label(x.card)).join(' ')}`);
}
game.startPlaying();
console.log('\n--- playing ---');

function nameOf(id: string): string {
  return players.find((p) => p.id === id)!.name;
}

/** After a discard, every bot checks its memory for a matching rank and may stack. */
function tryStacks(): void {
  const state = game.getState();
  const window = state.matchWindow;
  if (!window?.open) return;
  for (const bot of players) {
    const mem = memory.get(bot.id)!;
    for (const victim of state.players) {
      for (const slot of victim.board) {
        if (mem.get(slot.slotId) !== window.rank) continue;
        const target: BoardTarget = { playerId: victim.id, slotId: slot.slotId };
        const result = game.attemptMatch(bot.id, target);
        if (result.outcome === 'window-closed') return;
        console.log(
          `  ⚡ ${nameOf(bot.id)} stacks ${label(result.card)} from ${nameOf(victim.id)}'s board (${result.outcome})`,
        );
        forget(slot.slotId);
        if (result.outcome === 'correct-opponent') {
          // Give away a card we know nothing about if possible (keep known-good cards).
          const board = game.getPlayer(bot.id).board;
          const unknown = board.find((s) => !mem.has(s.slotId)) ?? board[0];
          if (unknown) {
            mem.delete(unknown.slotId);
            forget(unknown.slotId);
            game.giveCard(bot.id, unknown.slotId);
            console.log(`    …and gives a face-down card to ${nameOf(victim.id)}`);
          }
        }
        return; // window is now closed
      }
    }
  }
}

function knownTotal(botId: string): { total: number; unknownCount: number } {
  const mem = memory.get(botId)!;
  let total = 0;
  let unknownCount = 0;
  for (const slot of game.getPlayer(botId).board) {
    const rank = mem.get(slot.slotId);
    if (rank === undefined) unknownCount++;
    else total += rankValue(rank);
  }
  return { total, unknownCount };
}

function rankValue(rank: Rank): number {
  if (rank === 'A') return 0;
  if (rank === 'J' || rank === 'Q') return 10;
  if (rank === 'K') return 6; // expected value: half red (-1), half black (12)
  return parseInt(rank, 10);
}

let turns = 0;
while ((game.phase === 'playing' || game.phase === 'final-round') && turns < 200) {
  turns++;
  const pid = game.currentPlayerId;
  const mem = memory.get(pid)!;
  const me = game.getPlayer(pid);
  const { total, unknownCount } = knownTotal(pid);

  // Call Cactus if fully informed and score looks strong.
  if (game.phase === 'playing' && unknownCount === 0 && total <= 5 && turns > players.length) {
    console.log(`\n${nameOf(pid)} calls CACTUS! (believes total ${total})`);
    game.callCactus(pid);
    tryStacks();
    continue;
  }

  const card = game.drawFromDeck(pid);
  process.stdout.write(`\n${nameOf(pid)} draws ${label(card)}: `);

  // Find our worst known slot and any unknown slot.
  const knownSlots = me.board.filter((s) => mem.has(s.slotId));
  const worstKnown = knownSlots.sort(
    (a, b) => rankValue(mem.get(b.slotId)!) - rankValue(mem.get(a.slotId)!),
  )[0];
  const unknownSlot = me.board.find((s) => !mem.has(s.slotId));

  const isAction = ['7', '8', '9', '10', 'J', 'Q'].includes(card.rank);

  if (isAction && unknownCount > 0 && ['7', '8'].includes(card.rank) && unknownSlot) {
    game.playDrawnActionCard(pid);
    const seen = game.resolvePeekOwn(pid, unknownSlot.slotId);
    mem.set(unknownSlot.slotId, seen.rank);
    console.log(`plays 7/8, peeks own card: ${label(seen)}`);
  } else if (isAction && ['9', '10'].includes(card.rank)) {
    const opponent = game.getState().players.find((p) => p.id !== pid && p.board.length > 0);
    if (opponent) {
      game.playDrawnActionCard(pid);
      const slot = opponent.board[0]!;
      const seen = game.resolvePeekOpponent(pid, { playerId: opponent.id, slotId: slot.slotId });
      mem.set(slot.slotId, seen.rank);
      console.log(`plays 9/10, peeks ${nameOf(opponent.id)}'s card: ${label(seen)}`);
    } else {
      game.discardDrawnCard(pid);
      console.log('discards it (no opponent cards to peek)');
    }
  } else if (worstKnown && card.value < rankValue(mem.get(worstKnown.slotId)!)) {
    const previous = mem.get(worstKnown.slotId);
    forget(worstKnown.slotId);
    game.swapDrawnCard(pid, worstKnown.slotId);
    mem.set(worstKnown.slotId, card.rank);
    console.log(`swaps into a known slot (was a ${previous})`);
  } else if (unknownSlot && card.value <= 4) {
    game.swapDrawnCard(pid, unknownSlot.slotId);
    forget(unknownSlot.slotId);
    mem.set(unknownSlot.slotId, card.rank);
    console.log('swaps into an unknown slot');
  } else {
    game.discardDrawnCard(pid);
    console.log('discards it');
  }

  tryStacks();
  game.closeMatchWindow(); // simulate the window timing out
}

console.log(`\n--- reveal (after ${turns} turns) ---`);
const scores = game.getScores();
for (const p of game.getState().players) {
  const cards = p.board.map((s) => label(s.card)).join(' ') || '(empty board)';
  console.log(`${p.name.padEnd(6)} ${String(scores.totals[p.id]).padStart(3)}  ${cards}`);
}
console.log(`\nWinner(s): ${scores.winnerIds.map(nameOf).join(', ')}`);
