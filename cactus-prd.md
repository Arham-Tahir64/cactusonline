# Cactus — Online Multiplayer Card Game
## Product Requirements Document (for implementation agent)

---

## 1. Overview

**Goal:** Build a web-based, real-time multiplayer implementation of the card game "Cactus" (also known as Golf/Cabo-style game), playable by friends across different networks. Standard 52-card deck, no jokers.

**Players:** 2–6 per game (soft cap at 8 if performance allows).

**Platform:** Web app, playable on desktop and mobile browsers. No native app required for v1.

**Core technical challenge:** This game is entirely built on *hidden information* (each player only partially knows their own board) and a *race condition mechanic* (the losing-cards stacking rule). The server must be the single source of truth for all card state; clients only ever see what they're entitled to see. Get this wrong and the game is trivially cheatable via browser devtools.

---

## 2. Formalized Game Rules

### 2.1 Setup
- Standard 52-card deck, shuffled.
- Each player dealt 4 cards face-down in a 2x2 grid ("board").
- Remaining deck placed face-down as the **draw pile**.
- Top card of the draw pile flipped face-up to start the **discard pile**.
- Each player may privately view their **bottom two cards only** (their board is indexed as top-left, top-right, bottom-left, bottom-right; "bottom row" = the two closest to them) for a fixed peek phase (e.g. 10 seconds, configurable) before the game starts.
- Once a player's first turn begins, no more free peeking — only via action cards (7/8/9/10).

### 2.2 Card Values
| Card | Value |
|---|---|
| Red King (♥/♦) | -1 |
| Ace | 0 |
| 2–10 | face value |
| Jack | 10 |
| Queen | 10 |
| Black King (♠/♣) | 12 |

### 2.3 Turn Structure
On a player's turn, they choose **one** of the following:
1. **Draw from deck.** Look at the card privately. Then either:
   - Swap it into any one of their 4 board slots (old card goes face-up to discard), OR
   - Discard it directly without swapping, OR
   - If it's an **action card** (7, 8, 9, 10, J, Q), play its effect instead (see 2.4), then it goes to discard.
2. **Draw from discard pile (top card only).** Must swap it into one of their 4 board slots. No peeking-and-declining — it's a known card, so this is a committed swap. Old card goes face-up to discard.
3. **Call "Cactus."** Ends the drawing phase of the game (see 2.6).

### 2.4 Action Cards
Only triggered when the card is **drawn from the deck** (not from discard, not via a swap-in from elsewhere) and the player chooses to play it instead of swapping/discarding:
- **7 or 8** — Look at one of your own board cards.
- **9 or 10** — Look at one opponent's board card.
- **J** — Blind swap: pick any two cards on the board (yours or anyone's) and swap their positions without looking at either.
- **Q** — Look at any one card on the board, then you must swap it with a card of your choice from anywhere on the board (can be your own vs your own, or yours vs an opponent's). The look and the swap are mandatory together.

After the effect resolves, the action card is discarded face-up.

### 2.5 Losing Cards (Discard-Matching Rule)
Whenever a card is sent face-up to the discard pile (by any means — draw-swap, discard, or action-card discard), a **matching window** opens:
- Any player who believes they know the location of another card of the **same rank** anywhere on the board (their own board or an opponent's) may attempt to "stack" it onto the discard pile.
- **First valid attempt wins.** This is real-time — whoever clicks/confirms first gets it, server-arbitrated.
- **Correct match, own card:** that card is removed from their board permanently and placed on the discard pile. Their board shrinks by one slot.
- **Correct match, opponent's card:** that card is removed from the opponent's board and placed on the discard pile. The stacking player must then give one of their own board cards (face-down, unseen by the opponent) to that opponent. Net effect: stacker's board shrinks by 1; opponent's board stays the same size but the specific card is now one the stacker chose (opponent does not get to look at it).
- **Incorrect match:** no penalty to the board size of the victim. The player who attempted the wrong stack **permanently gains the misplayed card** face-down onto their own board (board grows by one slot).
- **Only one card may be stacked per discard event.** Once one player successfully stacks, the window closes. A second, slower correct attempt has no effect (no penalty — the window is just closed).
- Matching window closes automatically once the next player's turn action begins (draw/discard/action resolves).

*Design note for the agent:* boards are **variable length** (can shrink to as few as 0 cards, or grow beyond 4). Score and end-game logic must handle variable board sizes, including a board of zero cards scoring 0.

### 2.6 Calling Cactus & Game End
- On their turn, instead of drawing, a player may call "Cactus."
- This is a declaration — no card interaction happens on this turn for the caller beyond the call itself.
- Every other player gets exactly one more turn, in normal turn order.
- Once turn order returns to the player who called Cactus, the round ends immediately (no further stacking window after the last card resolves — give it its normal window, then close).
- All players flip their remaining board cards face-up.
- Scores are totaled (sum of remaining card values per player, lower is better).
- Lowest total wins. Ties: split win (v1) — configurable later.

### 2.7 Open Rule Questions (confirm before/while building — defaults noted)
- **Deck exhaustion:** if the draw pile runs out, reshuffle the discard pile (except its top card) into a new draw pile. *(Assumed default — confirm.)*
- **Calling Cactus with an empty board:** allowed; scores 0 for that player if the round ends there. *(Assumed default.)*
- **Multiple simultaneous stack attempts within milliseconds:** server timestamp order decides; ties resolved by server receive order. *(Assumed default.)*
- **Bluffing the "look" on 7/8/9/10/Q:** effect is always real (not optional to fake), the UI just needs to keep it private to the acting player.

---

## 3. Data Model (server-authoritative)

```ts
type Suit = 'S' | 'H' | 'D' | 'C';
type Rank = 'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K';

interface Card {
  id: string;        // unique per physical card, stable across the game
  rank: Rank;
  suit: Suit;
  value: number;      // derived from rank+suit (red K = -1, black K = 12)
}

interface BoardSlot {
  slotId: string;     // stable per-player slot identifier
  card: Card | null;  // null once permanently removed (matched away)
  faceUp: boolean;    // true only during final reveal
}

interface PlayerState {
  id: string;
  name: string;
  avatarSeed: string;
  board: BoardSlot[];         // variable length, starts at 4
  isConnected: boolean;
  hasCalledCactus: boolean;
}

interface KnownCardMemory {
  // CLIENT-SIDE ONLY, never sent to other clients.
  // Tracks what THIS player currently believes about board slots,
  // built from their own peeks/actions. Purely a local UI aid.
  [slotGlobalId: string]: { rank: Rank; suit: Suit; confidence: 'seen' | 'inferred' };
}

interface GameState {
  gameId: string;
  players: PlayerState[];
  turnOrder: string[];         // player ids
  currentTurnIndex: number;
  drawPileCount: number;       // clients only ever see the count, not contents
  discardPile: Card[];         // top of array = top of pile, fully visible
  phase: 'lobby' | 'peek' | 'playing' | 'final-round' | 'reveal' | 'ended';
  cactusCallerId: string | null;
  matchWindow: {
    open: boolean;
    discardEventId: string;
    expiresAt: number; // server timestamp
  } | null;
  pendingAction: {           // mid-resolution action card state
    type: '7-8' | '9-10' | 'J' | 'Q';
    actingPlayerId: string;
    stage: string;
  } | null;
}
```

**Critical rule:** the full `Card` (rank/suit) for face-down slots is **never serialized to a client** unless that client is specifically entitled to see it at that moment (their own peek, an action-card look, or final reveal). The server holds the canonical `GameState`; each client receives a redacted per-player view.

---

## 4. Game Flow / State Machine

```
lobby → (host starts game) → peek phase (all players, timed) → playing
playing loop, per turn:
  turn-start → player chooses: draw-deck | draw-discard | call-cactus
    draw-deck:
      → reveal card privately to acting player
      → choose: swap-in | discard | play-action (if action rank)
      → resolve → card lands face-up on discard → OPEN MATCH WINDOW
    draw-discard:
      → must swap-in → old card lands face-up on discard → OPEN MATCH WINDOW
    call-cactus:
      → mark cactusCallerId, phase → final-round
  MATCH WINDOW (parallel, can be attempted by anyone, any player's turn):
      → first valid claim resolves per 2.5 → possibly re-opens board size changes
      → window closes on timeout or next turn action
  advance turn to next connected player
final-round: each remaining player gets exactly one turn (same loop, no cactus option)
reveal: flip all boards, compute scores, show results
ended: option to rematch (new shuffle, same lobby)
```

---

## 5. Real-Time Actions & Timing Windows

This is the trickiest networking piece. Recommendations:
- Use a **single authoritative game server process per match** (not fully P2P — hidden info makes P2P unsafe) holding the canonical `GameState`.
- All player actions go server → validated → state mutated → redacted views broadcast to each client.
- The match window (2.5) should be implemented as a short server-side lock: first `attemptMatch` message received for a given `discardEventId` wins; all others get an "already resolved" rejection. Use server receive timestamp, not client-reported timestamp, to prevent clock-skew cheating.
- Keep the match window generous enough to be fair across different connection qualities (e.g. 4–6 seconds, configurable) but not so long it stalls pacing. Show a visible countdown to all players.

---

## 6. Technical Architecture

**Recommended pattern:** authoritative game server with WebSocket-based real-time state sync, thin client that renders redacted state.

**Suggested stack** (fits well with a React/TypeScript/Redux background, minimal new tools to learn):
- **Server:** Node.js + TypeScript. Use **Colyseus** (purpose-built multiplayer room/state-sync framework) instead of hand-rolling raw Socket.io — it gives you authoritative rooms, per-client state filtering (exactly what's needed for hidden-info games), reconnection support, and schema-based delta sync out of the box. This directly solves the "don't leak face-down cards to the wrong client" problem via its built-in view filtering.
  - Alternative if you'd rather stay closer to what you already know: Node + `ws`/Socket.io with a hand-written redaction layer per broadcast. More control, more to build/debug.
- **Client:** React + TypeScript + Redux (or Zustand — lighter, pairs well with Colyseus's client state proxy). Vite for bundling.
- **Rendering:** Framer Motion for card flip/move/deal animations over styled React components (2D, no need for a full canvas engine like PixiJS for this — a card game doesn't need it, and it adds complexity without much payoff for a table game).
- **Transport:** WebSockets (Colyseus uses this natively). Works across different networks/NATs since it's client → central server, no P2P hole-punching needed.
- **Hosting:** small persistent Node process (Colyseus needs long-lived process, not serverless functions) — e.g. Fly.io, Railway, or a small VPS. Static frontend can go anywhere (Vercel/Netlify/Cloudflare Pages).
- **Persistence:** in-memory game state is sufficient for v1 (games are short-lived); optional Redis if you want games to survive a server restart or want match history/stats later.

---

## 7. UI/UX & Graphics

- **Table view:** oval/circular table layout, players arranged around it, current player's own board anchored at the bottom of the screen (rotate seating perspective per client — everyone sees themselves at the "bottom").
- **Cards:** clean 2D vector card faces (build or use an open SVG card deck asset), consistent card-back design. Smooth flip animation (3D CSS transform or Framer Motion `rotateY`) for reveals.
- **Board slots:** 2x2 (or N, once variable-size) grid per player, clear face-down placeholder vs face-up card states, subtle highlight on hover for selectable slots during swap/action targeting.
- **Draw pile:** shows remaining count, not contents. Tap/click to draw, with a brief private-peek overlay only the drawing player sees.
- **Discard pile:** top card fully visible to all, with a visible/animated **match-window countdown** ring or timer bar when open, and a clear "Stack!" action button/target area.
- **Action card resolution UI:** contextual overlays — e.g. for 7/8, tap one of your own cards to peek (shown only to you, brief timed reveal then flips back); for J, tap two cards anywhere to blind-swap (no reveal); for Q, tap to look then must tap a card to swap with.
- **Turn indicator:** clear active-player highlight, turn timer optional (configurable, off by default for casual play).
- **Cactus call:** prominent confirm dialog ("Are you sure? This starts the final round") given it's irreversible.
- **End screen:** all boards flipped, animated reveal, running score tally, winner highlight.
- **Lobby:** shareable game code/link, avatar picker, player list with ready states, host controls (start game, kick, adjust rules like peek-timer length or reshuffle behavior).
- **Mobile-first responsive layout** — this will very likely be played on phones passed around or on separate devices; touch targets sized accordingly.

---

## 8. Lobby & Networking (cross-network play)

- Host creates a game → gets a short shareable room code (e.g. `CAC-7XQ2`) and/or link.
- Friends join via code/link from any network — all traffic routes through the central WebSocket server, so no port-forwarding/NAT issues on anyone's end.
- Reconnection handling: if a player's connection drops mid-game, hold their seat (mark `isConnected: false`, auto-play-safe default like "skip to discard-nothing" is risky — better to just pause turn timer / let others wait) and allow rejoin via the same room code within a grace period (e.g. 5 minutes) restoring their exact state.
- Spectator mode: optional, low priority for v1.

---

## 9. Anti-Cheat / Hidden Information Handling

Since this is friends playing casually, full anti-cheat isn't critical, but the architecture should still not have gaping holes, because "check devtools network tab to see everyone's cards" ruins the game instantly if the server ever broadcasts full state:
- Server must send **per-client redacted views** — never broadcast the full `GameState` with all card faces to every client.
- Face-down cards a client isn't entitled to see should not even be present as rank/suit in that client's payload (send `null` or a placeholder, not just a client-side "don't render this" flag).
- Validate every action server-side (it's your turn, this card exists, this slot is valid, this match-window claim is real) — never trust client-submitted game logic outcomes.

---

## 10. Implementation Phases (suggested order for the agent)

1. **Core engine, no networking:** deck, dealing, turn state machine, scoring, action card effects, match-window logic — all as pure/testable TypeScript, playable via console/test harness with simulated players.
2. **Server wiring:** wrap the engine in a Colyseus room (or chosen alternative), define the per-client redacted state schema, get basic join/leave/turn-taking working with a minimal (non-styled) client.
3. **Client UI, static/no-animation pass:** table layout, board rendering, draw/discard/swap interactions, action card targeting UI — functional but plain.
4. **Real-time polish:** match-window countdown UI, action-resolution overlays, turn indicators, reconnection handling.
5. **Visual polish:** card art, flip/deal animations, table theming, sound effects (optional), avatars.
6. **Lobby & sharing:** room codes, host controls, rule config (peek timer, match-window duration, tie handling).
7. **Playtest pass:** run full games with 3–4 people across real networks, focus especially on the match-window race condition under real latency.

---

## 11. Out of Scope for v1
- Native mobile apps
- Persistent accounts / stats / ranking
- Spectator mode
- AI/bot players
- Voice/video chat integration (assume friends use a separate call)
