# Gameplay QA report

Date: 2026-07-21  
Target: `electron` branch, authoritative local Colyseus room

## Result

The deterministic engine suite and real local Colyseus integration clients cover the complete round lifecycle. Hidden board faces remain absent from wire views during both peek and normal play; after the peek timer, `peekCards` is `null` and all four local cards are face-down. Reconnection receives a newly generated redacted view rather than cached private state.

## Coverage exercised

- Lobby creation/join, room codes, host-only start, avatar allocation, and 2–8 player engine rounds.
- Timed peek transition and post-peek redaction for every player and slot.
- Draw-deck, take-discard swap, held-card swap, direct discard, turn order, and duplicate/out-of-turn rejection.
- 7/8 own peek, 9/10 opponent peek, Jack blind swap, and Queen private look plus mandatory swap.
- Stack success on own/opponent boards, give-card resolution, incorrect penalties, timeout, duplicate delivery, and first-message-wins races.
- Cactus, final turns, final Stack window, reveal, scoring/ties, and rematch transition.
- Dropped connection, seat hold, same-session reconnect, fresh redacted reconnect state, explicit host departure, host transfer, and rematch without departed seats.
- Deck exhaustion and discard reshuffle.

## Bugs fixed

1. **Queen target information leak:** `pendingAction.qLookTarget` exposed the privately inspected slot to every client. It is now populated only in the acting player's view; the card face continues to travel only through that player's private `revealed` message.
2. **Duplicate failed Stack penalty:** retransmitting the exact same failed Stack command during an open window could add multiple penalty cards. Attempts are now idempotent per discard event, player, and target, returning `duplicate-attempt` without a second mutation or public card reveal.
3. **Departed host retained authority:** an explicit mid-game host departure left rematch authority attached to an absent session. Authority now moves to a connected player, and rematches exclude disconnected/departed seats.
4. **Duplicate Stack feedback:** ignored duplicate/closed-window outcomes no longer play a failure sound.

## Automated evidence

- Focused engine and room run: 50 tests passed (35 engine, 15 room).
- TypeScript: `tsc --noEmit` passed.
- The room tests connect actual `colyseus.js` clients to the local `@colyseus/testing` server and assert wire payloads, private messages, timers, concurrent command ordering, disconnects, and reconnection.

## Remaining manual/production risks

- Run the same scenarios against the deployed secure WebSocket endpoint; this pass used a real local server, not the hosted environment.
- Perform a latency/packet-loss soak with multiple physical machines. Colyseus serializes received commands correctly, but network fairness depends on the configured Stack-window duration.
- A disconnected current player intentionally retains their turn during the five-minute reconnect grace period. Product policy should decide whether a future timer should skip or forfeit abandoned turns.
- Exercise the full five-minute reconnection-expiry path in a long-running staging test; automated coverage tests disconnect/reconnect but does not wait five minutes.
