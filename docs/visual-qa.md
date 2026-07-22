# Visual fidelity QA

The surrounding table presentation was compared against the supplied Cactus
reference while retaining this project's own board, rules, and card content.
The final pass emphasizes a shallow 2.5D table angle, layered rail and card
shadows, warm candle pools, readable seating, and intentional use of the felt
at compact, full-HD, and high-DPI desktop sizes.

## Final capture matrix

Every cell below was captured from a real local Colyseus room through Electron
after the peek timer ended. The capture harness asserted the exact viewport,
player count, four board cards per player, `phase: playing`, and zero exposed
board cards. This includes the local player's bottom two cards.

| Viewport | 2 players | 4 players | 6 players | 8 players |
| --- | --- | --- | --- | --- |
| 1280x720 | 8 cards, 0 exposed | 16 cards, 0 exposed | 24 cards, 0 exposed | 32 cards, 0 exposed |
| 1920x1080 | 8 cards, 0 exposed | 16 cards, 0 exposed | 24 cards, 0 exposed | 32 cards, 0 exposed |
| 2560x1440 | 8 cards, 0 exposed | 16 cards, 0 exposed | 24 cards, 0 exposed | 32 cards, 0 exposed |

The final screenshots are stored under:

`C:/Users/Arham/.codex/visualizations/2026/07/21/019f8641-12f9-7550-b69c-cb0a9fa7d05d/cactus-visual-qa/final`

The progression/before captures are stored one directory above the final
folder, including `2-5d-iteration-1.jpg`, `2-5d-four-player-iteration-1.jpg`,
and `2-5d-eight-player-iteration-1.jpg`.

## Layout findings

- 1280x720: side seats clear the guide, controls remain centered, and crowded
  six/eight-player layouts fit without clipping or card overlap.
- 1920x1080: the four-player local board fits above the lower rail, the north
  board clears the center pile, and eight-player actions remain centered.
- 2560x1440: a dedicated high-DPI tier enlarges cards, portraits, piles,
  nameplates, actions, and the guide so the table does not become empty felt.
- Empty reconnect activity panels are omitted instead of leaving a blank
  chat-shaped block in the lower-left corner.

## Verification

- Root game/server suite: 77 tests passed.
- Electron security suite: 5 tests passed.
- Root and client TypeScript checks passed.
- Production client build passed.
- Packaged Windows Electron smoke test passed.
- `git diff --check` passed.

Reproduce a capture while the local server is running with:

```powershell
npm run desktop:capture -- --players=4 --width=1920 --height=1080 --output=C:\tmp\cactus-4p.jpg
```
