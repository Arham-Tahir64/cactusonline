# Cactus — Online Multiplayer Card Game

Implementation of [cactus-prd.md](cactus-prd.md). Currently at **Phase 6: lobby & sharing** — on top of the earlier phases this now has client-side reconnection (refresh or drop mid-game and reclaim your held seat within 5 minutes), framer-motion card flip/deal/discard animations with a match-window countdown bar, host-configurable rules (peek timer, stack-window duration) and kick in the lobby, plus a Dockerfile + fly.toml for deployment. Remaining: real-network playtest (Phase 7).

## Commands

```sh
npm install                 # root deps (engine, server, tests)
npm run client:install      # client deps (separate package.json in client/)

npm test                    # engine unit tests + room integration tests
npm run typecheck           # tsc --noEmit (root)

npm run simulate            # play a full game with 4 simulated bots (engine only, no server)
npm run simulate -- 42      # …with a fixed seed for a reproducible game

npm run dev                 # server (watch mode) + client (Vite dev, HMR) together, via concurrently
# — or run them separately in two terminals:
npm run server:watch        # game server on :2567
npm run client:dev          # Vite dev server on :5173 (connects to ws://localhost:2567)

npm run client:build        # production build of the client into public/ (server serves it from there)
npm run server              # single-process server, serving the last client:build output at :2567
```

**To play during development:** run `npm run dev`, then open **http://localhost:5173** in two or more tabs. Create a game in one tab, join with the `CAC-XXXX` code in the others.

**To play a single-process build:** `npm run client:build && npm run server`, then open **http://localhost:2567**.

## Deployment

The whole app (WebSocket server + static client) ships as one container; game state is in-memory, so run **exactly one instance** (PRD §6 — Colyseus needs a long-lived process, and a second instance would split the room-code namespace).

```sh
docker build -t cactusonline .        # multi-stage: builds the client, then a prod-only runtime
docker run -p 2567:2567 cactusonline  # serves http + ws on :2567 (respects $PORT)
```

For [Fly.io](https://fly.io), [fly.toml](fly.toml) is ready: `fly launch` (accept the existing config), then `fly scale count 1`. The config pins one always-on machine and forces HTTPS — the client automatically connects over `wss://` when served from an `https://` page, so no client config is needed. Railway or any VPS that can run the Dockerfile works the same way.

## Layout

- [src/engine/](src/engine/) — pure game engine (types, deck, `CactusGame` state machine). See Phase 1 notes below.
- [src/server/](src/server/) — Colyseus room wrapping the engine, redacted state broadcast, timers, reconnection. See Phase 2 notes below.
- [client/](client/) — React + TypeScript + Zustand + Vite client (Phase 3).
  - `src/store.ts` — the only place that talks to the Colyseus `Room`; holds the latest redacted view, lobby state, event log, and transient private reveals (action-card looks flip back after a few seconds — it's a memory game, nothing stays visible), plus the click-targeting state machine for action cards.
  - `src/components/Table.tsx` — oval seating: "you" are always anchored at the bottom, other players distributed clockwise around an ellipse (positions computed with trig in JS, not a layout library).
  - `src/components/BoardSlot.tsx` / `PlayerBoard.tsx` — board rendering; a slot shows the real card only when the server's redacted view includes it (face-up, final reveal, your bottom row during the peek phase, or a timed action-card look), otherwise a card back.
  - `src/components/ActionBar.tsx` — turn actions (draw/take-discard/cactus/stack) and the drawn-card panel (swap/discard/play-action).
  - `src/components/GameScreen.tsx` — drives the mandatory action-card and give-a-card sequences automatically via the server's `pendingAction`/`pendingGive` state, so the player is always told what to click next.
  - Imports engine types directly from `../src/engine` via a `@engine` alias (Vite `resolve.alias` + `tsconfig` `paths`) — the client's type of a `Card` or `PlayerView` can never drift from the server's.

## Client design notes (Phase 3)

- **No animation, no card art:** cards render as plain text labels (`7♠`, `K♥`) in bordered buttons. Phase 5 is where flips/deals/art land.
- **State shape mirrors the wire protocol directly:** the store doesn't reshape `PlayerView` into a different client model — components read `view.players[i].board[j]` etc. straight off the redacted payload, keeping the redaction boundary visible and easy to audit.
- **Click-to-target instead of drag-and-drop:** every interaction (swap, stack, action-card targeting, jack's two-card blind swap, queen's look-then-swap) is "set a mode, then click a board slot," mirroring the original vanilla dev client's interaction model one-for-one.
- **The old `public/index.html` vanilla client is gone** — `client:build` now owns `public/`. If you need the original minimal client back for reference, it's in git history.

---

Older phase notes:

## Engine design notes (Phase 1)

- **Pure & deterministic:** no timers or I/O. Time-driven transitions are explicit host calls: `startPlaying()` ends the peek phase, `closeMatchWindow()` is the match-window timeout. A seed or injected deck makes games fully reproducible.
- **Server-authoritative:** `getState()` is the canonical state (server-side only). `getPlayerView(playerId)` returns the redacted view for one client — face-down card faces are omitted entirely.
- **Match window:** opens on every face-up discard event; first correct stack wins and closes it (the host is responsible for calling `attemptMatch` in receive order). It closes automatically when the next turn action begins. Turn actions are blocked while a stacker owes a card give.
- **Variable boards:** slots are removed entirely when matched away (rather than nulled); boards can shrink to 0 (scores 0) or grow via incorrect stacks.

### Rule interpretations chosen (PRD §2.5 / §2.7 defaults)

- **Incorrect stack:** the misplayed card goes back to its owner (it never leaves the slot), and the attempter draws a penalty card from the draw pile face-down onto their own board (reshuffling the discard pile if the draw pile is empty). A failed attempt does *not* close the window.
- **Give with an empty board:** a stacker who correctly stacks an opponent's card but has no cards left simply skips the give.
- **Deck exhaustion:** discard pile (minus its top card) is reshuffled into a new draw pile.
- **Final window:** after the last final-round turn, the last discard keeps its normal match window; the reveal fires once that window closes (or a stack resolves it).

## Server design notes (Phase 2)

- **No Colyseus schema sync:** the engine already produces redacted `PlayerView` JSON per player, so the room sends each client its own view as a plain `view` message after every mutation instead of using schema-based delta sync.
- **Messages:** clients send `start`, `draw-deck`, `draw-discard`, `swap`, `discard-drawn`, `play-action`, `peek-own`, `peek-opponent`, `jack-swap`, `queen-look`, `queen-swap`, `call-cactus`, `attempt-match`, `give`, `rematch`. The server replies with `view`, `lobby`, `revealed` (private looks), `event` (public happenings), `scores`, and `error`.
- **Timers live in the room, not the engine:** the peek phase (default 10s) and match window (default 5s) are `room.clock` timeouts, configurable via room creation options (`peekMs`, `matchWindowMs`).
- **First-valid-wins stacking** falls out of the single-threaded message queue: `attempt-match` messages are processed in server receive order.
- **Room codes:** short shareable ids like `CAC-7XQ2`, uniqueness tracked via Colyseus presence.
- **Reconnection:** a mid-game disconnect holds the seat for 5 minutes (`allowReconnection`); the player is flagged `isConnected: false` in everyone's view meanwhile.
- **Test note:** Colyseus conflicts with Vitest's default forked-process pool, so [vitest.config.ts](vitest.config.ts) switches tests to worker threads.

## PRD phases

1. ✅ Core engine, no networking
2. ✅ Server wiring (Colyseus room, redacted state sync)
3. ✅ Client UI, static pass
4. ✅ Real-time polish (match-window countdown, reconnection flow, turn indicators)
5. ✅ Visual polish (card faces, flip/deal/discard animations)
6. ✅ Lobby & sharing (room codes, host rule config, kick)
7. ⬜ Playtest pass
