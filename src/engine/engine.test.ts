import { describe, expect, it } from 'vitest';
import { CactusGame, GameError } from './engine.js';
import { makeCard } from './deck.js';
import type { Card, Rank, Suit } from './types.js';

const c = (rank: Rank, suit: Suit = 'S'): Card => makeCard(rank, suit);

/**
 * Build an injected deck from cards listed in DEAL ORDER (first card listed is
 * the first card dealt/drawn). The engine pops from the end of the array.
 *
 * 2-player deal order: p1 gets cards 0-3 (board slots 0-3), p2 gets cards 4-7,
 * card 8 is flipped as the first discard, card 9+ are subsequent deck draws.
 */
const deckInDealOrder = (cards: Card[]): Card[] => [...cards].reverse();

const TWO_PLAYERS = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
];

/** A padded 2-player game where every board card is a distinct low number. */
function basicGame(extraDraws: Card[] = [c('5', 'H'), c('6', 'H'), c('9', 'H')]) {
  const deck = deckInDealOrder([
    // p1 board: top-left, top-right, bottom-left, bottom-right
    c('A', 'S'), c('2', 'S'), c('3', 'S'), c('4', 'S'),
    // p2 board
    c('A', 'H'), c('2', 'H'), c('3', 'H'), c('4', 'H'),
    // first discard
    c('K', 'C'),
    // draw pile from here
    ...extraDraws,
  ]);
  const game = new CactusGame(TWO_PLAYERS, { deck, seed: 1 });
  game.startPlaying();
  return game;
}

const slotId = (game: CactusGame, playerId: string, index: number) =>
  game.getPlayer(playerId).board[index]!.slotId;

describe('setup & peek phase', () => {
  it('deals 4 face-down cards each, flips one discard, starts in peek', () => {
    const game = new CactusGame(TWO_PLAYERS, { seed: 42 });
    const state = game.getState();
    expect(state.phase).toBe('peek');
    expect(state.players.every((p) => p.board.length === 4)).toBe(true);
    expect(state.players.every((p) => p.board.every((s) => !s.faceUp))).toBe(true);
    expect(state.discardPile).toHaveLength(1);
    expect(state.drawPile).toHaveLength(52 - 8 - 1);
  });

  it('peek shows exactly the bottom two cards (slots 2 and 3)', () => {
    const game = new CactusGame(TWO_PLAYERS, {
      deck: deckInDealOrder([
        c('A'), c('2'), c('3'), c('4'),
        c('5'), c('6'), c('7'), c('8'),
        c('9'), c('10'),
      ]),
    });
    const peek = game.getPeekCards('p1');
    expect(peek.map((p) => p.card.rank)).toEqual(['3', '4']);
    expect(game.getPeekCards('p2').map((p) => p.card.rank)).toEqual(['7', '8']);
  });

  it('rejects turn actions during peek, and peeking after start', () => {
    const game = new CactusGame(TWO_PLAYERS, { seed: 1 });
    expect(() => game.drawFromDeck('p1')).toThrow(GameError);
    game.startPlaying();
    expect(() => game.getPeekCards('p1')).toThrow(GameError);
  });

  it('rejects invalid player counts', () => {
    expect(() => new CactusGame([{ id: 'p1', name: 'solo' }])).toThrow(GameError);
  });
});

describe('turn structure', () => {
  it('draw from deck, swap into a slot: old card goes face-up to discard', () => {
    const game = basicGame([c('5', 'H')]);
    const drawn = game.drawFromDeck('p1');
    expect(drawn.rank).toBe('5');

    game.swapDrawnCard('p1', slotId(game, 'p1', 0)); // replaces the A♠
    const state = game.getState();
    expect(game.getPlayer('p1').board[0]!.card.rank).toBe('5');
    expect(state.discardPile.at(-1)!.rank).toBe('A');
    expect(state.matchWindow?.open).toBe(true);
    expect(game.currentPlayerId).toBe('p2'); // turn advanced
  });

  it('draw from deck, discard directly without swapping', () => {
    const game = basicGame([c('5', 'H')]);
    game.drawFromDeck('p1');
    game.discardDrawnCard('p1');
    expect(game.getState().discardPile.at(-1)!.rank).toBe('5');
    expect(game.currentPlayerId).toBe('p2');
  });

  it('draw from discard is a committed atomic swap', () => {
    const game = basicGame();
    game.drawFromDiscard('p1', slotId(game, 'p1', 1)); // takes the K♣, ditches the 2♠
    expect(game.getPlayer('p1').board[1]!.card.rank).toBe('K');
    expect(game.getState().discardPile.at(-1)!.rank).toBe('2');
    expect(game.currentPlayerId).toBe('p2');
  });

  it('enforces turn order and stage', () => {
    const game = basicGame();
    expect(() => game.drawFromDeck('p2')).toThrow(/not your turn/i);
    game.drawFromDeck('p1');
    expect(() => game.drawFromDeck('p1')).toThrow(/already in progress/i);
    expect(() => game.swapDrawnCard('p2', slotId(game, 'p2', 0))).toThrow(/not your turn/i);
    expect(() => game.discardDrawnCard('p1')).not.toThrow();
  });

  it('cannot swap into another player’s slot', () => {
    const game = basicGame();
    game.drawFromDeck('p1');
    expect(() => game.swapDrawnCard('p1', slotId(game, 'p2', 0))).toThrow(/no such slot/i);
  });
});

describe('action cards', () => {
  it('7/8 peeks one of your own cards, then the action card is discarded', () => {
    const game = basicGame([c('7', 'H')]);
    game.drawFromDeck('p1');
    expect(game.playDrawnActionCard('p1')).toBe('7-8');
    const seen = game.resolvePeekOwn('p1', slotId(game, 'p1', 0));
    expect(seen.rank).toBe('A');
    expect(game.getState().discardPile.at(-1)!.rank).toBe('7');
    expect(game.getState().matchWindow?.open).toBe(true);
    expect(game.currentPlayerId).toBe('p2');
  });

  it('9/10 peeks an opponent card and rejects self-targeting', () => {
    const game = basicGame([c('9', 'H')]);
    game.drawFromDeck('p1');
    game.playDrawnActionCard('p1');
    expect(() =>
      game.resolvePeekOwn('p1', slotId(game, 'p1', 0)),
    ).toThrow(/pending action is 9-10/i);
    expect(() =>
      game.resolvePeekOpponent('p1', { playerId: 'p1', slotId: slotId(game, 'p1', 0) }),
    ).toThrow(/opponent/i);
    const seen = game.resolvePeekOpponent('p1', { playerId: 'p2', slotId: slotId(game, 'p2', 3) });
    expect(seen.rank).toBe('4');
  });

  it('J blind-swaps any two board cards without revealing them', () => {
    const game = basicGame([c('J', 'H')]);
    game.drawFromDeck('p1');
    game.playDrawnActionCard('p1');
    game.resolveJackSwap(
      'p1',
      { playerId: 'p1', slotId: slotId(game, 'p1', 0) },
      { playerId: 'p2', slotId: slotId(game, 'p2', 0) },
    );
    expect(game.getPlayer('p1').board[0]!.card.rank).toBe('A');
    expect(game.getPlayer('p1').board[0]!.card.suit).toBe('H'); // got p2's A♥
    expect(game.getPlayer('p2').board[0]!.card.suit).toBe('S');
    expect(game.getState().discardPile.at(-1)!.rank).toBe('J');
  });

  it('Q look is followed by a mandatory swap', () => {
    const game = basicGame([c('Q', 'H')]);
    game.drawFromDeck('p1');
    game.playDrawnActionCard('p1');
    const seen = game.resolveQueenLook('p1', { playerId: 'p2', slotId: slotId(game, 'p2', 0) });
    expect(seen.rank).toBe('A');
    // Cannot look twice, cannot skip the swap by drawing again.
    expect(() =>
      game.resolveQueenLook('p1', { playerId: 'p2', slotId: slotId(game, 'p2', 1) }),
    ).toThrow(/swap is pending/i);
    game.resolveQueenSwap('p1', { playerId: 'p1', slotId: slotId(game, 'p1', 3) });
    expect(game.getPlayer('p2').board[0]!.card.rank).toBe('4'); // got p1's 4♠
    expect(game.getPlayer('p1').board[3]!.card.suit).toBe('H'); // got p2's A♥
    expect(game.currentPlayerId).toBe('p2');
  });

  it('non-action ranks cannot be played as actions', () => {
    const game = basicGame([c('5', 'H')]);
    game.drawFromDeck('p1');
    expect(() => game.playDrawnActionCard('p1')).toThrow(/no action effect/i);
  });

  it('cards taken from the discard pile never trigger actions', () => {
    const game = basicGame();
    // K♣ is on discard; drawFromDiscard is an atomic swap with no action path.
    game.drawFromDiscard('p1', slotId(game, 'p1', 0));
    expect(() => game.playDrawnActionCard('p1')).toThrow(GameError);
  });
});

describe('match window (losing-cards rule)', () => {
  it('correct stack of your own card shrinks your board and closes the window', () => {
    // p1 discards a 5; p2 has a 5 on their board.
    const game = new CactusGame(TWO_PLAYERS, {
      deck: deckInDealOrder([
        c('A'), c('2'), c('3'), c('4'),
        c('5', 'H'), c('6', 'H'), c('7', 'H'), c('8', 'H'),
        c('K', 'C'),
        c('5', 'D'),
      ]),
    });
    game.startPlaying();
    game.drawFromDeck('p1');
    game.discardDrawnCard('p1'); // 5♦ face-up, window opens

    const target = { playerId: 'p2', slotId: slotId(game, 'p2', 0) };
    const result = game.attemptMatch('p2', target);
    expect(result.outcome).toBe('correct-own');
    expect(game.getPlayer('p2').board).toHaveLength(3);
    expect(game.getState().discardPile.at(-1)!.id).toBe('5H');

    // Window closed: a second (would-be correct) attempt has no effect.
    const again = game.attemptMatch('p1', { playerId: 'p1', slotId: slotId(game, 'p1', 0) });
    expect(again.outcome).toBe('window-closed');
  });

  it('correct stack of an opponent card requires giving them one of yours', () => {
    // p1 discards a 6; p2's board has a 6 that p1 stacks.
    const game = new CactusGame(TWO_PLAYERS, {
      deck: deckInDealOrder([
        c('A'), c('2'), c('3'), c('4'),
        c('6', 'H'), c('7', 'H'), c('8', 'H'), c('9', 'H'),
        c('K', 'C'),
        c('6', 'D'),
      ]),
    });
    game.startPlaying();
    game.drawFromDeck('p1');
    game.discardDrawnCard('p1');

    const result = game.attemptMatch('p1', { playerId: 'p2', slotId: slotId(game, 'p2', 0) });
    expect(result.outcome).toBe('correct-opponent');
    expect(game.getPlayer('p2').board).toHaveLength(3);

    // Turn actions are blocked until the give resolves.
    expect(() => game.drawFromDeck('p2')).toThrow(/give/i);

    const givenSlot = slotId(game, 'p1', 0); // gives away the A♠
    game.giveCard('p1', givenSlot);
    expect(game.getPlayer('p1').board).toHaveLength(3); // net: shrank by one
    expect(game.getPlayer('p2').board).toHaveLength(4); // back to original size
    expect(game.getPlayer('p2').board.at(-1)!.card.id).toBe('AS');
    expect(game.getPlayer('p2').board.at(-1)!.faceUp).toBe(false);
  });

  it('incorrect stack: card goes back, attempter draws a penalty card', () => {
    const game = basicGame([c('5', 'H'), c('9', 'D')]);
    game.drawFromDeck('p1');
    game.discardDrawnCard('p1'); // 5♥ on discard, 9♦ left in the draw pile

    // p2 wrongly stacks p1's A♠ (not a 5).
    const result = game.attemptMatch('p2', { playerId: 'p1', slotId: slotId(game, 'p1', 0) });
    expect(result.outcome).toBe('incorrect');
    expect(result.outcome === 'incorrect' && result.card.id).toBe('AS');

    // The misplayed card stays where it was.
    expect(game.getPlayer('p1').board).toHaveLength(4);
    expect(game.getPlayer('p1').board[0]!.card.id).toBe('AS');

    // The attempter grew by one: a face-down penalty card off the draw pile.
    expect(game.getPlayer('p2').board).toHaveLength(5);
    expect(game.getPlayer('p2').board.at(-1)!.card.id).toBe('9D');
    expect(game.getPlayer('p2').board.at(-1)!.faceUp).toBe(false);
    expect(game.getState().drawPile).toHaveLength(0);

    // The window is still open for a correct attempt.
    expect(game.getState().matchWindow?.open).toBe(true);
  });

  it('penalty draw reshuffles the discard pile if the draw pile is empty', () => {
    const game = basicGame([c('5', 'H')]); // draw pile empty after p1's draw
    game.drawFromDeck('p1');
    game.discardDrawnCard('p1'); // discard: [K♣, 5♥]

    const result = game.attemptMatch('p2', { playerId: 'p1', slotId: slotId(game, 'p1', 0) });
    expect(result.outcome).toBe('incorrect');
    // Penalty came from reshuffling the K♣ under the top discard.
    expect(game.getPlayer('p2').board.at(-1)!.card.id).toBe('KC');
    expect(game.getState().discardPile.map((x) => x.rank)).toEqual(['5']);
  });

  it('the window closes when the next player takes their turn action', () => {
    const game = basicGame([c('5', 'H'), c('6', 'H')]);
    game.drawFromDeck('p1');
    game.discardDrawnCard('p1');
    expect(game.getState().matchWindow?.open).toBe(true);

    game.drawFromDeck('p2'); // next turn action begins
    const attempt = game.attemptMatch('p1', { playerId: 'p1', slotId: slotId(game, 'p1', 0) });
    expect(attempt.outcome).toBe('window-closed');
  });

  it('board can shrink to zero and scores 0 at reveal', () => {
    // p2 holds two pairs; four discard events let p2 stack all four cards away.
    const game = new CactusGame(TWO_PLAYERS, {
      deck: deckInDealOrder([
        c('A'), c('2'), c('4'), c('5'),
        c('3', 'H'), c('3', 'D'), c('9', 'H'), c('9', 'D'),
        c('K', 'C'),
        c('3', 'S'), c('3', 'C'), c('9', 'S'), c('9', 'C'), c('6', 'H'),
      ]),
    });
    game.startPlaying();

    const stackOwn = (rank: Rank) => {
      const slot = game.getPlayer('p2').board.find((s) => s.card.rank === rank)!;
      const res = game.attemptMatch('p2', { playerId: 'p2', slotId: slot.slotId });
      expect(res.outcome).toBe('correct-own');
    };

    game.drawFromDeck('p1');
    game.discardDrawnCard('p1'); // 3♠ → window
    stackOwn('3');
    game.drawFromDeck('p2');
    game.discardDrawnCard('p2'); // 3♣ → window
    stackOwn('3');
    game.drawFromDeck('p1');
    game.discardDrawnCard('p1'); // 9♠ → window
    stackOwn('9');
    game.drawFromDeck('p2');
    game.discardDrawnCard('p2'); // 9♣ → window
    stackOwn('9');
    expect(game.getPlayer('p2').board).toHaveLength(0);

    // Calling Cactus with an empty board is allowed and scores 0.
    game.callCactus('p1');
    game.drawFromDeck('p2');
    game.discardDrawnCard('p2');
    game.closeMatchWindow();
    expect(game.phase).toBe('reveal');
    expect(game.getScores().totals['p2']).toBe(0);
    expect(game.getScores().winnerIds).toEqual(['p2']);
  });
});

describe('cactus & game end', () => {
  it('full cactus flow: others get one turn, then reveal and scores', () => {
    const game = new CactusGame(
      [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' },
      ],
      { seed: 99 },
    );
    game.startPlaying();
    game.callCactus('p1');
    expect(game.phase).toBe('final-round');
    expect(game.getState().cactusCallerId).toBe('p1');
    expect(game.currentPlayerId).toBe('p2');

    // Others cannot call cactus in the final round.
    expect(() => game.callCactus('p2')).toThrow(/main phase/i);

    game.drawFromDeck('p2');
    game.discardDrawnCard('p2');
    expect(game.phase).toBe('final-round');
    game.drawFromDeck('p3'); // closes p2's window
    game.discardDrawnCard('p3');

    // Round is over, but the last discard keeps its normal match window.
    expect(game.phase).toBe('final-round');
    expect(game.getState().matchWindow?.open).toBe(true);
    game.closeMatchWindow();

    expect(game.phase).toBe('reveal');
    const state = game.getState();
    expect(state.players.every((p) => p.board.every((s) => s.faceUp))).toBe(true);

    const scores = game.getScores();
    expect(Object.keys(scores.totals)).toHaveLength(3);
    const best = Math.min(...Object.values(scores.totals));
    expect(scores.winnerIds.every((id) => scores.totals[id] === best)).toBe(true);
    expect(() => game.drawFromDeck(game.getState().turnOrder[0]!)).toThrow(/phase/i);
  });

  it('a successful stack in the final window still resolves before reveal', () => {
    // p2 (last player before the caller) discards a 5 and p1 stacks their own 5.
    const game = new CactusGame(TWO_PLAYERS, {
      deck: deckInDealOrder([
        c('5', 'S'), c('2'), c('3'), c('4'),
        c('A', 'H'), c('6', 'H'), c('7', 'H'), c('8', 'H'),
        c('K', 'C'),
        c('5', 'D'),
      ]),
    });
    game.startPlaying();
    game.callCactus('p1');
    game.drawFromDeck('p2');
    game.discardDrawnCard('p2'); // 5♦, final window
    expect(game.phase).toBe('final-round');

    const res = game.attemptMatch('p1', { playerId: 'p1', slotId: slotId(game, 'p1', 0) });
    expect(res.outcome).toBe('correct-own');
    // Successful stack closed the window → reveal fires immediately.
    expect(game.phase).toBe('reveal');
    expect(game.getPlayer('p1').board).toHaveLength(3);
    expect(game.getScores().totals['p1']).toBe(2 + 3 + 4);
  });

  it('splits the win on ties', () => {
    // Both players end with identical totals.
    const game = new CactusGame(TWO_PLAYERS, {
      deck: deckInDealOrder([
        c('2', 'S'), c('3', 'S'), c('4', 'S'), c('5', 'S'),
        c('2', 'H'), c('3', 'H'), c('4', 'H'), c('5', 'H'),
        c('K', 'C'),
        c('9', 'H'), c('9', 'D'),
      ]),
    });
    game.startPlaying();
    game.callCactus('p1');
    game.drawFromDeck('p2');
    game.discardDrawnCard('p2');
    game.closeMatchWindow();
    const scores = game.getScores();
    expect(scores.totals).toEqual({ p1: 14, p2: 14 });
    expect(scores.winnerIds.sort()).toEqual(['p1', 'p2']);
  });
});

describe('deck exhaustion', () => {
  it('reshuffles the discard pile (minus top card) into a new draw pile', () => {
    const game = new CactusGame(TWO_PLAYERS, {
      deck: deckInDealOrder([
        c('A'), c('2'), c('3'), c('4'),
        c('A', 'H'), c('2', 'H'), c('3', 'H'), c('4', 'H'),
        c('K', 'C'),
        c('5', 'H'), c('6', 'H'), // only two cards in the draw pile
      ]),
      seed: 5,
    });
    game.startPlaying();
    game.drawFromDeck('p1');
    game.discardDrawnCard('p1'); // 5♥ → discard: [K♣, 5♥]
    game.drawFromDeck('p2');
    game.discardDrawnCard('p2'); // 6♥ → discard: [K♣, 5♥, 6♥], draw pile empty

    const drawn = game.drawFromDeck('p1'); // triggers reshuffle of [K♣, 5♥]
    expect(['K', '5']).toContain(drawn.rank);
    const state = game.getState();
    expect(state.discardPile.map((x) => x.rank)).toEqual(['6']); // top card kept
    expect(state.drawPile.length + 1).toBe(2); // one drawn, one left
  });
});

describe('redacted player views', () => {
  it('preserves each player avatar in redacted views', () => {
    const game = new CactusGame([
      { id: 'p1', name: 'Alice', avatarId: 'vaquera' },
      { id: 'p2', name: 'Bob', avatarId: 'botanist' },
    ]);

    expect(game.getPlayerView('p1').players.map((player) => player.avatarId)).toEqual([
      'vaquera',
      'botanist',
    ]);
  });

  it('never leaks face-down card faces or another player’s drawn card', () => {
    const game = basicGame([c('5', 'H')]);
    game.drawFromDeck('p1');

    const p1View = game.getPlayerView('p1');
    expect(p1View.drawnCard?.rank).toBe('5');

    const p2View = game.getPlayerView('p2');
    expect(p2View.drawnCard).toBeNull();
    for (const player of p2View.players) {
      for (const slot of player.board) {
        expect(slot.card).toBeNull(); // nothing face-up yet anywhere
      }
    }
    expect(p2View.drawPileCount).toBe(game.getState().drawPile.length);
    expect(p2View.discardPile.at(-1)!.rank).toBe('K'); // discard is public
  });

  it('reveals everything after the final reveal', () => {
    const game = basicGame();
    game.callCactus('p1');
    game.drawFromDeck('p2');
    game.discardDrawnCard('p2');
    game.closeMatchWindow();
    const view = game.getPlayerView('p2');
    expect(view.phase).toBe('reveal');
    for (const player of view.players) {
      for (const slot of player.board) expect(slot.card).not.toBeNull();
    }
  });

  it('exposes peek cards only during the peek phase and only your own', () => {
    const game = new CactusGame(TWO_PLAYERS, { seed: 3 });
    const view = game.getPlayerView('p1');
    expect(view.peekCards).toHaveLength(2);
    game.startPlaying();
    expect(game.getPlayerView('p1').peekCards).toBeNull();
  });
});
