# Proposal

## Why

After M2 two Players can sit in the same Match, but there is nothing to do there: the Tokens never leave Start. M3 makes it a game: Players take Turns, press Roll, and their Tokens Move, climb Ladders, slide down Snakes, until one of them reaches the Emerald City and wins.

## What Changes

- When the second Player joins, the server picks the first Current Player at random.
- The Current Player presses **Roll** (or Space/Enter on a desktop). The server throws one six-sided die, Moves the Token, applies a Ladder or Snake, and passes the Turn to the other Player. The other Player has no Roll button.
- Reaching or passing Cell 30 wins: the Match becomes Finished, both Players see who won, and no more Rolls are accepted.
- Both screens show whose Turn it is and what the last Turn did ("Alex rolled 3: Start → 3 → Ladder → 11").
- Tokens stand on their Player's Cell instead of always at Start; two Tokens on one Cell stand side by side. They move straight to the new Cell. Hopping Cell by Cell, a tumbling die and themed Jumps come later (M4, M5).
- A Player may Roll while the other one is disconnected; the returning Player sees the Board as it is now. (The 5-minute Abandoned rule is M6.)
- Matches stored by M2 keep working: a Match without positions gets its Tokens at Start, and an In-progress one without a Current Player gets one picked at random when it is next loaded.
- The post-deploy smoke test plays two Rolls in production and checks that the Turn alternates.

Out of scope: dice and Move animations, a follow camera (M4); Event Names and themed Jumps (M5); Rematch, timers, Abandoned (M6); any turn timer (none is planned).

## Capabilities

### New Capabilities

- `game-rules`: how a Match is played: the first Current Player, the Turn, the Roll, the Move, the Jump, the Winner, and when Rolls are refused. Independent of how anything is drawn.
- `match-play`: what each Player sees and does during a Match: whose Turn it is, the Roll button and keys, the last Turn's result, and the Winner screen.

### Modified Capabilities

- `board-view`: "Tokens appear for taken Seats" changes so that each Token stands on its Player's current Cell (Start until its first Move) and two Tokens sharing a Cell stand side by side.

## Impact

- `shared/`: a pure rules module (`takeTurn(match, roll)` returning the new state and what happened), wider Match snapshot (positions, Current Player, Winner, last Turn), a new `roll` client message and `rolled` update.
- `server/`: the Match Durable Object accepts `roll` from the Current Player only, throws the die with `crypto.getRandomValues`, stores the result, and fills in M2-era Matches on load.
- `client/`: Turn banner, Roll button with keyboard shortcut, last-Turn text, Winner panel; Tokens drawn on their Cells.
- `e2e/`: a full game played to a Winner in the local visual checks; two Rolls in the production smoke test.
- Data: stored Matches gain fields; no Durable Object migration is needed (same class, new fields read with defaults).
