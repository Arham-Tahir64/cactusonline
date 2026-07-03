# Cactus — Online Multiplayer Card Game

Implementation of [cactus-prd.md](cactus-prd.md). Currently at **Phase 1: core engine, no networking** — a pure, testable TypeScript game engine with a console harness.

## Commands

```sh
npm install
npm test              # run the test suite (vitest)
npm run typecheck     # tsc --noEmit
npm run simulate      # play a full game with 4 simulated players
npm run simulate -- 42  # …with a fixed seed for a reproducible game
```

## Layout

- [src/engine/types.ts](src/engine/types.ts) — cards, board slots, engine state, redacted per-player views
- [src/engine/deck.ts](src/engine/deck.ts) — deck construction, card values, seedable RNG + shuffle
- [src/engine/engine.ts](src/engine/engine.ts) — `CactusGame`: the full turn state machine, action cards, match-window logic, scoring
- [src/harness/simulate.ts](src/harness/simulate.ts) — console simulation with naive memory-based bots

## Engine design notes

- **Pure & deterministic:** no timers or I/O. Time-driven transitions are explicit host calls: `startPlaying()` ends the peek phase, `closeMatchWindow()` is the match-window timeout. A seed or injected deck makes games fully reproducible.
- **Server-authoritative:** `getState()` is the canonical state (server-side only). `getPlayerView(playerId)` returns the redacted view for one client — face-down card faces are omitted entirely, ready for Phase 2 wiring.
- **Match window:** opens on every face-up discard event; first correct stack wins and closes it (the host is responsible for calling `attemptMatch` in receive order). It closes automatically when the next turn action begins. Turn actions are blocked while a stacker owes a card give.
- **Variable boards:** slots are removed entirely when matched away (rather than nulled); boards can shrink to 0 (scores 0) or grow via incorrect stacks.

### Rule interpretations chosen (PRD §2.5 / §2.7 defaults)

- **Incorrect stack:** implemented literally per the PRD — the misplayed card moves face-down onto the attempter's board (revealed to the table by the failed attempt). If it was the attempter's own card, board size is net unchanged. A failed attempt does *not* close the window.
- **Give with an empty board:** a stacker who correctly stacks an opponent's card but has no cards left simply skips the give.
- **Deck exhaustion:** discard pile (minus its top card) is reshuffled into a new draw pile.
- **Final window:** after the last final-round turn, the last discard keeps its normal match window; the reveal fires once that window closes (or a stack resolves it).

## PRD phases

1. ✅ Core engine, no networking
2. ⬜ Server wiring (Colyseus room, redacted state sync)
3. ⬜ Client UI, static pass
4. ⬜ Real-time polish
5. ⬜ Visual polish
6. ⬜ Lobby & sharing
7. ⬜ Playtest pass
