import {
  createDeck,
  createRng,
  shuffle,
  type Rng,
} from './deck.js';
import type {
  ActionType,
  BoardSlot,
  BoardTarget,
  Card,
  EngineState,
  MatchResult,
  PlayerState,
  PlayerView,
  Rank,
  Scores,
} from './types.js';

export class GameError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export interface GameOptions {
  gameId?: string;
  seed?: number;
  /** Inject a fixed deck (dealt from the END of the array) for deterministic tests. */
  deck?: Card[];
  rng?: Rng;
}

const ACTION_RANKS: ReadonlySet<Rank> = new Set(['7', '8', '9', '10', 'J', 'Q']);

function actionTypeFor(rank: Rank): ActionType {
  if (rank === '7' || rank === '8') return '7-8';
  if (rank === '9' || rank === '10') return '9-10';
  if (rank === 'J') return 'J';
  return 'Q';
}

/**
 * Pure, server-authoritative Cactus game engine. No networking, no timers:
 * time-driven transitions (peek end, match-window timeout) are exposed as
 * explicit methods (`startPlaying`, `closeMatchWindow`) for the host to call.
 */
export class CactusGame {
  private state: EngineState;
  private readonly rng: Rng;
  private slotCounter = 0;

  constructor(players: { id: string; name: string }[], options: GameOptions = {}) {
    if (players.length < 2 || players.length > 8) {
      throw new GameError('invalid-player-count', 'Cactus supports 2-8 players.');
    }
    const ids = new Set(players.map((p) => p.id));
    if (ids.size !== players.length) {
      throw new GameError('duplicate-player-id', 'Player ids must be unique.');
    }

    this.rng = options.rng ?? createRng(options.seed ?? Math.floor(Math.random() * 2 ** 31));

    const drawPile = options.deck ? [...options.deck] : shuffle(createDeck(), this.rng);

    const playerStates: PlayerState[] = players.map((p) => ({
      id: p.id,
      name: p.name,
      board: [],
      isConnected: true,
      hasCalledCactus: false,
    }));

    // Deal 4 cards each: slots indexed 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right.
    for (const player of playerStates) {
      for (let i = 0; i < 4; i++) {
        const card = drawPile.pop();
        if (!card) throw new GameError('deck-too-small', 'Not enough cards to deal.');
        player.board.push(this.makeSlot(player.id, card));
      }
    }

    const firstDiscard = drawPile.pop();
    if (!firstDiscard) throw new GameError('deck-too-small', 'Not enough cards to deal.');

    this.state = {
      gameId: options.gameId ?? `game-${Math.floor(this.rng() * 1e9).toString(36)}`,
      players: playerStates,
      turnOrder: players.map((p) => p.id),
      currentTurnIndex: 0,
      drawPile,
      discardPile: [firstDiscard],
      phase: 'peek',
      turnStage: 'awaiting-draw',
      drawnCard: null,
      cactusCallerId: null,
      matchWindow: null,
      pendingAction: null,
      pendingGive: null,
      revealPending: false,
      discardEventCounter: 0,
    };
  }

  // -------------------------------------------------------------------------
  // Introspection
  // -------------------------------------------------------------------------

  /** Full canonical state. Server-side only — never send this to a client. */
  getState(): Readonly<EngineState> {
    return this.state;
  }

  get phase() {
    return this.state.phase;
  }

  get currentPlayerId(): string {
    return this.state.turnOrder[this.state.currentTurnIndex]!;
  }

  getPlayer(playerId: string): PlayerState {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) throw new GameError('unknown-player', `No such player: ${playerId}`);
    return player;
  }

  /** Mark a player as (dis)connected; game state is otherwise held for them. */
  setConnected(playerId: string, connected: boolean): void {
    this.getPlayer(playerId).isConnected = connected;
  }

  /** Redacted view for one client: face-down card faces are omitted entirely. */
  getPlayerView(playerId: string): PlayerView {
    const s = this.state;
    this.getPlayer(playerId); // validate

    const reveal = s.phase === 'reveal' || s.phase === 'ended';
    return {
      gameId: s.gameId,
      you: playerId,
      players: s.players.map((p) => ({
        id: p.id,
        name: p.name,
        isConnected: p.isConnected,
        hasCalledCactus: p.hasCalledCactus,
        board: p.board.map((slot) => ({
          slotId: slot.slotId,
          faceUp: slot.faceUp || reveal,
          card: slot.faceUp || reveal ? slot.card : null,
        })),
      })),
      turnOrder: [...s.turnOrder],
      currentPlayerId: this.currentPlayerId,
      drawPileCount: s.drawPile.length,
      discardPile: [...s.discardPile],
      phase: s.phase,
      turnStage: s.turnStage,
      drawnCard: playerId === this.currentPlayerId ? s.drawnCard : null,
      cactusCallerId: s.cactusCallerId,
      matchWindowOpen: s.matchWindow?.open ?? false,
      pendingAction: s.pendingAction
        ? {
            type: s.pendingAction.type,
            actingPlayerId: s.pendingAction.actingPlayerId,
            stage: s.pendingAction.stage,
            qLookTarget: s.pendingAction.qLookTarget,
          }
        : null,
      pendingGive: s.pendingGive ? { ...s.pendingGive } : null,
      peekCards: s.phase === 'peek' ? this.getPeekCards(playerId) : null,
    };
  }

  // -------------------------------------------------------------------------
  // Peek phase
  // -------------------------------------------------------------------------

  /** The bottom two cards (slots 2 and 3) a player may view during the peek phase. */
  getPeekCards(playerId: string): { slotId: string; card: Card }[] {
    if (this.state.phase !== 'peek') {
      throw new GameError('wrong-phase', 'Peeking is only allowed during the peek phase.');
    }
    const player = this.getPlayer(playerId);
    return player.board.slice(2, 4).map((slot) => ({ slotId: slot.slotId, card: slot.card }));
  }

  /** Host calls this when the peek timer expires. */
  startPlaying(): void {
    if (this.state.phase !== 'peek') {
      throw new GameError('wrong-phase', 'Game already started.');
    }
    this.state.phase = 'playing';
  }

  // -------------------------------------------------------------------------
  // Turn actions
  // -------------------------------------------------------------------------

  /** Draw the top card of the draw pile; returned privately to the acting player. */
  drawFromDeck(playerId: string): Card {
    this.assertTurnAction(playerId);
    this.closeMatchWindow();

    if (this.state.drawPile.length === 0) this.reshuffleDiscardIntoDrawPile();
    const card = this.state.drawPile.pop();
    if (!card) {
      throw new GameError('deck-exhausted', 'No cards left to draw, even after reshuffle.');
    }
    this.state.drawnCard = card;
    this.state.turnStage = 'holding-drawn-card';
    return card;
  }

  /** Swap the privately drawn card into a board slot; old card goes face-up to discard. */
  swapDrawnCard(playerId: string, slotId: string): void {
    const drawn = this.assertHoldingDrawnCard(playerId);
    const player = this.getPlayer(playerId);
    const slot = this.getSlot(player, slotId);

    const oldCard = slot.card;
    slot.card = drawn;
    this.state.drawnCard = null;
    this.discardCard(oldCard);
    this.finishTurn();
  }

  /** Discard the privately drawn card without swapping. */
  discardDrawnCard(playerId: string): void {
    const drawn = this.assertHoldingDrawnCard(playerId);
    this.state.drawnCard = null;
    this.discardCard(drawn);
    this.finishTurn();
  }

  /**
   * Take the top discard (a known card) and swap it into a board slot.
   * This is a committed swap — no peek-and-decline — so it is a single atomic call.
   */
  drawFromDiscard(playerId: string, slotId: string): void {
    this.assertTurnAction(playerId);
    const player = this.getPlayer(playerId);
    const slot = this.getSlot(player, slotId);
    if (this.state.discardPile.length === 0) {
      throw new GameError('empty-discard', 'Discard pile is empty.');
    }
    this.closeMatchWindow();

    const taken = this.state.discardPile.pop()!;
    const oldCard = slot.card;
    slot.card = taken;
    this.discardCard(oldCard);
    this.finishTurn();
  }

  /** On their turn, instead of drawing, a player may call Cactus (not in the final round). */
  callCactus(playerId: string): void {
    this.assertTurnAction(playerId);
    if (this.state.phase !== 'playing') {
      throw new GameError('wrong-phase', 'Cactus can only be called during the main phase.');
    }
    this.closeMatchWindow();
    this.getPlayer(playerId).hasCalledCactus = true;
    this.state.cactusCallerId = playerId;
    this.state.phase = 'final-round';
    this.advanceTurn();
  }

  // -------------------------------------------------------------------------
  // Action cards (only playable when drawn from the deck)
  // -------------------------------------------------------------------------

  /** Choose to play the drawn card's effect instead of swapping/discarding it. */
  playDrawnActionCard(playerId: string): ActionType {
    const drawn = this.assertHoldingDrawnCard(playerId);
    if (!ACTION_RANKS.has(drawn.rank)) {
      throw new GameError('not-action-card', `${drawn.rank} has no action effect.`);
    }
    const type = actionTypeFor(drawn.rank);
    this.state.pendingAction = {
      type,
      actingPlayerId: playerId,
      stage: 'pick-target',
      qLookTarget: null,
    };
    this.state.turnStage = 'resolving-action';
    return type;
  }

  /** 7/8: look at one of your OWN board cards. Returned privately. */
  resolvePeekOwn(playerId: string, slotId: string): Card {
    this.assertPendingAction(playerId, '7-8');
    const slot = this.getSlot(this.getPlayer(playerId), slotId);
    this.completeAction();
    return slot.card;
  }

  /** 9/10: look at one OPPONENT board card. Returned privately. */
  resolvePeekOpponent(playerId: string, target: BoardTarget): Card {
    this.assertPendingAction(playerId, '9-10');
    if (target.playerId === playerId) {
      throw new GameError('invalid-target', '9/10 must target an opponent card.');
    }
    const slot = this.getSlot(this.getPlayer(target.playerId), target.slotId);
    this.completeAction();
    return slot.card;
  }

  /** J: blind-swap any two board cards (yours or anyone's), no reveal. */
  resolveJackSwap(playerId: string, a: BoardTarget, b: BoardTarget): void {
    this.assertPendingAction(playerId, 'J');
    if (a.playerId === b.playerId && a.slotId === b.slotId) {
      throw new GameError('invalid-target', 'Cannot swap a card with itself.');
    }
    const slotA = this.getSlot(this.getPlayer(a.playerId), a.slotId);
    const slotB = this.getSlot(this.getPlayer(b.playerId), b.slotId);
    [slotA.card, slotB.card] = [slotB.card, slotA.card];
    this.completeAction();
  }

  /** Q stage 1: look at any one board card. Returned privately; swap is now mandatory. */
  resolveQueenLook(playerId: string, target: BoardTarget): Card {
    const action = this.assertPendingAction(playerId, 'Q');
    if (action.stage !== 'pick-target') {
      throw new GameError('wrong-stage', 'Queen look already taken; swap is pending.');
    }
    const slot = this.getSlot(this.getPlayer(target.playerId), target.slotId);
    action.stage = 'q-swap';
    action.qLookTarget = { ...target };
    return slot.card;
  }

  /** Q stage 2: mandatory swap of the looked-at card with any other board card. */
  resolveQueenSwap(playerId: string, other: BoardTarget): void {
    const action = this.assertPendingAction(playerId, 'Q');
    if (action.stage !== 'q-swap' || !action.qLookTarget) {
      throw new GameError('wrong-stage', 'Must look at a card before swapping.');
    }
    const looked = action.qLookTarget;
    if (looked.playerId === other.playerId && looked.slotId === other.slotId) {
      throw new GameError('invalid-target', 'Cannot swap the looked-at card with itself.');
    }
    const slotA = this.getSlot(this.getPlayer(looked.playerId), looked.slotId);
    const slotB = this.getSlot(this.getPlayer(other.playerId), other.slotId);
    [slotA.card, slotB.card] = [slotB.card, slotA.card];
    this.completeAction();
  }

  // -------------------------------------------------------------------------
  // Match window (losing-cards rule, 2.5)
  // -------------------------------------------------------------------------

  /**
   * Attempt to stack a board card onto the discard pile during an open match window.
   * Any player may attempt, targeting any board. First valid attempt wins —
   * the server host is responsible for calling this in receive order.
   */
  attemptMatch(playerId: string, target: BoardTarget): MatchResult {
    const window = this.state.matchWindow;
    if (!window || !window.open) return { outcome: 'window-closed' };
    this.getPlayer(playerId); // validate attacker exists
    if (this.state.pendingGive) {
      throw new GameError('give-pending', 'A card give is still pending.');
    }

    const victim = this.getPlayer(target.playerId);
    const slotIndex = victim.board.findIndex((s) => s.slotId === target.slotId);
    if (slotIndex === -1) {
      throw new GameError('unknown-slot', `No such slot: ${target.slotId}`);
    }
    const slot = victim.board[slotIndex]!;
    const card = slot.card;

    if (card.rank === window.rank) {
      // Correct: card leaves its board and lands face-up on the discard pile.
      victim.board.splice(slotIndex, 1);
      this.state.discardPile.push(card);
      window.open = false; // only one card may be stacked per discard event
      if (target.playerId !== playerId && this.getPlayer(playerId).board.length > 0) {
        // Stacker must give one of their own cards (face-down) to the victim.
        // (A stacker with an empty board has nothing to give — the give is skipped.)
        this.state.pendingGive = { fromPlayerId: playerId, toPlayerId: target.playerId };
        return { outcome: 'correct-opponent', card, mustGiveTo: target.playerId };
      }
      this.maybeReveal();
      return { outcome: 'correct-own', card };
    }

    // Incorrect: the misplayed card goes back to its owner (it never leaves the
    // slot), and the attempter draws a penalty card from the draw pile
    // face-down onto their own board.
    const attacker = this.getPlayer(playerId);
    if (this.state.drawPile.length === 0) this.reshuffleDiscardIntoDrawPile();
    const penalty = this.state.drawPile.pop();
    if (penalty) attacker.board.push(this.makeSlot(playerId, penalty));
    return { outcome: 'incorrect', card };
  }

  /**
   * After correctly stacking an opponent's card: give one of your own board
   * cards (face-down, unseen by the opponent) to that opponent.
   */
  giveCard(playerId: string, slotId: string): void {
    const give = this.state.pendingGive;
    if (!give || give.fromPlayerId !== playerId) {
      throw new GameError('no-give-pending', 'You have no card give pending.');
    }
    const giver = this.getPlayer(playerId);
    const slotIndex = giver.board.findIndex((s) => s.slotId === slotId);
    if (slotIndex === -1) {
      throw new GameError('unknown-slot', `No such slot: ${slotId}`);
    }
    const [slot] = giver.board.splice(slotIndex, 1);
    const receiver = this.getPlayer(give.toPlayerId);
    receiver.board.push(this.makeSlot(receiver.id, slot!.card));
    this.state.pendingGive = null;
    this.maybeReveal();
  }

  /** Close the match window (host timeout, or automatically on the next turn action). */
  closeMatchWindow(): void {
    if (this.state.matchWindow?.open) {
      this.state.matchWindow.open = false;
    }
    this.maybeReveal();
  }

  // -------------------------------------------------------------------------
  // Scoring
  // -------------------------------------------------------------------------

  /** Available once the phase reaches 'reveal'. Lower is better; ties split the win. */
  getScores(): Scores {
    if (this.state.phase !== 'reveal' && this.state.phase !== 'ended') {
      throw new GameError('wrong-phase', 'Scores are only available after the reveal.');
    }
    const totals: Record<string, number> = {};
    for (const player of this.state.players) {
      totals[player.id] = player.board.reduce((sum, slot) => sum + slot.card.value, 0);
    }
    const best = Math.min(...Object.values(totals));
    const winnerIds = this.state.players.filter((p) => totals[p.id] === best).map((p) => p.id);
    return { totals, winnerIds };
  }

  endGame(): void {
    if (this.state.phase !== 'reveal') {
      throw new GameError('wrong-phase', 'Game is not in the reveal phase.');
    }
    this.state.phase = 'ended';
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private makeSlot(playerId: string, card: Card): BoardSlot {
    return { slotId: `${playerId}:s${this.slotCounter++}`, card, faceUp: false };
  }

  private getSlot(player: PlayerState, slotId: string): BoardSlot {
    const slot = player.board.find((s) => s.slotId === slotId);
    if (!slot) throw new GameError('unknown-slot', `No such slot: ${slotId}`);
    return slot;
  }

  private assertTurnAction(playerId: string): void {
    const s = this.state;
    if (s.phase !== 'playing' && s.phase !== 'final-round') {
      throw new GameError('wrong-phase', `No turn actions during phase '${s.phase}'.`);
    }
    if (this.currentPlayerId !== playerId) {
      throw new GameError('not-your-turn', 'It is not your turn.');
    }
    if (s.turnStage !== 'awaiting-draw') {
      throw new GameError('wrong-stage', 'A turn action is already in progress.');
    }
    if (s.pendingGive) {
      throw new GameError('give-pending', 'Waiting for a pending card give to resolve.');
    }
  }

  private assertHoldingDrawnCard(playerId: string): Card {
    if (this.currentPlayerId !== playerId) {
      throw new GameError('not-your-turn', 'It is not your turn.');
    }
    if (this.state.turnStage !== 'holding-drawn-card' || !this.state.drawnCard) {
      throw new GameError('wrong-stage', 'You are not holding a drawn card.');
    }
    return this.state.drawnCard;
  }

  private assertPendingAction(playerId: string, type: ActionType) {
    const action = this.state.pendingAction;
    if (!action || this.state.turnStage !== 'resolving-action') {
      throw new GameError('no-pending-action', 'No action card is being resolved.');
    }
    if (action.actingPlayerId !== playerId) {
      throw new GameError('not-your-action', 'This is not your action to resolve.');
    }
    if (action.type !== type) {
      throw new GameError('wrong-action', `Pending action is ${action.type}, not ${type}.`);
    }
    return action;
  }

  /** Action effect resolved: the action card itself now goes face-up to discard. */
  private completeAction(): void {
    const drawn = this.state.drawnCard;
    if (!drawn) throw new GameError('internal', 'Action completed with no drawn card.');
    this.state.pendingAction = null;
    this.state.drawnCard = null;
    this.discardCard(drawn);
    this.finishTurn();
  }

  /** Send a card face-up to the discard pile and open a fresh match window. */
  private discardCard(card: Card): void {
    this.state.discardPile.push(card);
    this.state.discardEventCounter++;
    this.state.matchWindow = {
      open: true,
      discardEventId: `discard-${this.state.discardEventCounter}`,
      rank: card.rank,
    };
  }

  private finishTurn(): void {
    this.state.turnStage = 'awaiting-draw';
    this.advanceTurn();
  }

  private advanceTurn(): void {
    const s = this.state;
    const nextIndex = (s.currentTurnIndex + 1) % s.turnOrder.length;
    const nextPlayerId = s.turnOrder[nextIndex]!;

    if (s.phase === 'final-round' && nextPlayerId === s.cactusCallerId) {
      // Turn order has returned to the caller: the round is over. Give the last
      // discard its normal match window; reveal fires once it closes.
      s.revealPending = true;
      this.maybeReveal();
      return;
    }
    s.currentTurnIndex = nextIndex;
  }

  /** Fire the final reveal once the round is over and nothing is left pending. */
  private maybeReveal(): void {
    const s = this.state;
    if (!s.revealPending || s.matchWindow?.open || s.pendingGive) return;
    s.revealPending = false;
    s.phase = 'reveal';
    for (const player of s.players) {
      for (const slot of player.board) slot.faceUp = true;
    }
  }

  /** Deck exhaustion: reshuffle the discard pile (except its top card) into a new draw pile. */
  private reshuffleDiscardIntoDrawPile(): void {
    const s = this.state;
    if (s.discardPile.length <= 1) return; // nothing to reshuffle
    const top = s.discardPile.pop()!;
    s.drawPile = shuffle(s.discardPile, this.rng);
    s.discardPile = [top];
  }
}
