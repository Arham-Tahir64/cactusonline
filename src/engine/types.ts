export type Suit = 'S' | 'H' | 'D' | 'C';
export const AVATAR_IDS = [
  'ranger',
  'maverick',
  'sage',
  'prospector',
  'vaquera',
  'outlaw',
  'botanist',
  'drifter',
] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && (AVATAR_IDS as readonly string[]).includes(value);
}

export type Rank =
  | 'A' | '2' | '3' | '4' | '5' | '6' | '7'
  | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string; // unique per physical card, stable across the game (e.g. "KH")
  rank: Rank;
  suit: Suit;
  value: number; // red K = -1, black K = 12, A = 0, J/Q = 10
}

export interface BoardSlot {
  slotId: string; // stable per-player slot identifier
  card: Card; // slots are removed entirely when a card is matched away
  faceUp: boolean; // true only during final reveal
}

export interface PlayerState {
  id: string;
  name: string;
  avatarId: AvatarId;
  board: BoardSlot[]; // variable length, starts at 4
  isConnected: boolean;
  hasCalledCactus: boolean;
}

export type Phase = 'peek' | 'playing' | 'final-round' | 'reveal' | 'ended';

/** Where the current player is within their turn. */
export type TurnStage = 'awaiting-draw' | 'holding-drawn-card' | 'resolving-action';

export type ActionType = '7-8' | '9-10' | 'J' | 'Q';

export interface BoardTarget {
  playerId: string;
  slotId: string;
}

export interface PendingAction {
  type: ActionType;
  actingPlayerId: string;
  /** Q is two-stage: 'q-look' then 'q-swap'; others resolve in one step. */
  stage: 'pick-target' | 'q-swap';
  /** Set after the Q look, so the swap knows which card was looked at. */
  qLookTarget: BoardTarget | null;
}

export interface MatchWindow {
  open: boolean;
  discardEventId: string;
  /** Rank that must be matched (rank of the card discarded in this event). */
  rank: Rank;
}

export interface PendingGive {
  /** Player who correctly stacked an opponent's card and owes them one. */
  fromPlayerId: string;
  toPlayerId: string;
}

export interface EngineState {
  gameId: string;
  players: PlayerState[];
  turnOrder: string[]; // player ids
  currentTurnIndex: number;
  drawPile: Card[]; // top of pile = end of array
  discardPile: Card[]; // top of pile = end of array
  phase: Phase;
  turnStage: TurnStage;
  drawnCard: Card | null; // card privately held after draw-from-deck
  cactusCallerId: string | null;
  matchWindow: MatchWindow | null;
  pendingAction: PendingAction | null;
  pendingGive: PendingGive | null;
  /** Final round finished but match window / give still pending; reveal fires once resolved. */
  revealPending: boolean;
  discardEventCounter: number;
}

export interface Scores {
  totals: Record<string, number>;
  winnerIds: string[]; // ties split the win
}

/** Result of a stack attempt during a match window. */
export type MatchResult =
  | { outcome: 'correct-own'; card: Card }
  | { outcome: 'correct-opponent'; card: Card; mustGiveTo: string }
  | { outcome: 'incorrect'; card: Card } // card stays put; attempter draws a face-down penalty card
  | { outcome: 'duplicate-attempt' }
  | { outcome: 'window-closed' };

// ---------------------------------------------------------------------------
// Redacted per-player view (what a client is entitled to see)
// ---------------------------------------------------------------------------

export interface RedactedSlot {
  slotId: string;
  faceUp: boolean;
  card: Card | null; // only present when faceUp
}

export interface RedactedPlayer {
  id: string;
  name: string;
  avatarId: AvatarId;
  board: RedactedSlot[];
  isConnected: boolean;
  hasCalledCactus: boolean;
}

export interface PlayerView {
  gameId: string;
  you: string;
  players: RedactedPlayer[];
  turnOrder: string[];
  currentPlayerId: string;
  drawPileCount: number;
  discardPile: Card[]; // fully visible to all
  phase: Phase;
  turnStage: TurnStage;
  /** Only populated for the player currently holding a drawn card. */
  drawnCard: Card | null;
  cactusCallerId: string | null;
  matchWindowOpen: boolean;
  pendingAction: {
    type: ActionType;
    actingPlayerId: string;
    stage: string;
    /** Set once the Q look has happened, so clients can block re-picking that same card. */
    qLookTarget: BoardTarget | null;
  } | null;
  pendingGive: PendingGive | null;
  /** Your own peek cards during the peek phase (bottom two), null otherwise. */
  peekCards: { slotId: string; card: Card }[] | null;
}

/** Server transport metadata layered over the deterministic engine view. */
export interface RoomView extends PlayerView {
  serverNowMs: number;
  peekEndsAtMs: number | null;
  matchWindowEndsAtMs: number | null;
}
