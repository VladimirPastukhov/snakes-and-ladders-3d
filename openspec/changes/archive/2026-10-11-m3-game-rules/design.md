# Design

## Context

After M2 the `Match` Durable Object (`server/src/match.ts`) stores `{ code, phase, seats }`. It answers `hello` with `welcome` and broadcasts `update { event, match }` with the full snapshot. `shared/src/board.ts` already has `START`, `FINAL_CELL`, `JUMPS` and `resolveJump`. The client keeps a reducer over server messages (`client/src/match/state.ts`) and draws a Token per taken Seat at Start (`Tokens` in `client/src/board/scenery.tsx`); `window.__board.tokens` lists the drawn Seats in development builds. Requirements: `specs/game-rules`, `specs/match-play`, and the modified Tokens requirement in `specs/board-view`.

## Goals / Non-Goals

**Goals:**
- All rules in one pure, fully unit-tested module in `shared/`, with the die and the first-player choice injected so tests are deterministic.
- The server stays the only place that decides a Roll; the client only asks and displays.
- M2 Matches already in production storage keep working without a migration.

**Non-Goals:**
- Animating the die, the Move or the Jump (M4); Tokens jump straight to their new Cell.
- Undo, turn timers, or a log of every Turn (only the last Turn is kept and shown).

## Decisions

### A pure rules module with injected randomness
`shared/src/rules.ts` holds the game state and two functions:
- `startGame(first: Seat): GameState`: both positions at `START`, `currentPlayer = first`.
- `takeTurn(state, seat, roll): { state, turn } | null`: returns `null` (nothing changes) when the Match is not In progress or `seat` is not the Current Player. Otherwise `landed = min(from + roll, FINAL_CELL)`, `to = resolveJump(landed)`, and a `Turn` record `{ seat, roll, from, landed, to, jump?: "ladder" | "snake" }`. If `landed === FINAL_CELL` the phase becomes `finished` and `winner = seat`; otherwise the Turn passes to the other Seat.

Because the Board never chains Jumps and no Jump touches the Final Cell (`board-layout` spec), one `resolveJump` is always final and a Jump can never win.

*Alternative:* a class with methods on the Durable Object. Rejected: the config asks for pure functions in `shared/`, and the client may later reuse them (M4 animation previews).

### Snapshot and protocol
`MatchSnapshot` gains `positions: { creator: number, joiner: number }`, `currentPlayer: Seat | null`, `winner: Seat | null` and `lastTurn: Turn | null`, and `phase` gains `"finished"`. The new client message is `roll {}`, and `update.event` gains `"rolled"`. Every message still carries the full snapshot, so a reconnecting Player gets positions, Turn and last Turn from `welcome` alone.

A refused Roll (wrong Player, wrong phase, a duplicate press) gets no reply. That keeps the rules the only judge and avoids an error path the UI never needs when it behaves.

### Dice on the server
`server/src/dice.ts`: `rollDie()` uses `crypto.getRandomValues` with rejection sampling (bytes ≥ 252 are drawn again) so 1–6 are exactly equally likely. The first Current Player uses one random bit the same way. The Durable Object passes their results into `startGame` and `takeTurn`, so exact outcomes are tested in `shared/` with chosen numbers. Server tests check ranges and alternation instead of exact numbers, and set up end-game positions by writing storage directly (`runInDurableObject`).

Concurrency: the handler awaits nothing between loading the Match and saving it except storage calls, which Durable Object input gates serialise, so two quick `roll` messages are played one after the other and the second is refused by the rules.

### Upgrading M2 Matches on load
`load()` fills in missing fields: `positions` defaults to Start for both, `lastTurn` and `winner` to `null`, and an `in_progress` Match without `currentPlayer` gets one picked at random and saved. No Durable Object migration is needed because the class and its storage stay the same.

### Client
- `Tokens` takes `{ seat, cell }[]`. A Token on Cell n stands on `road.cells[n-1]`, at Start on `road.start`. Two Tokens with the same position are offset sideways as at Start today. `window.__board.tokens` becomes `{ seat, cell }[]`.
- The Match panel gains a Turn line ("Your Turn" / "Alex's Turn" with colour swatch), the last-Turn text, and the Roll button (only on the Current Player's screen). The Roll button is disabled after a press until the next snapshot arrives, with a 3-second fallback that re-enables it in case the request was lost.
- A `keydown` listener for Space and Enter requests a Roll when it is your Turn, ignoring events from inputs and buttons (a focused button already handles its own Space/Enter).
- A Finished Match shows the Winner panel ("You win!" / "Alex wins") with Back to home, in place of the Turn controls; the Players list stays.
- Text for the last Turn is built by one function from the `Turn` record, e.g. `Alex rolled 3: Start → 3 → Ladder → 11`, `Sam rolled 2: 5 → 7`, `Alex rolled 5: 28 → 30`.

### Testing
- `shared`: `takeTurn` table tests for every scenario in `game-rules` (plain, Ladder, Snake, shared Cell, six, exact win, passing win, refused out of turn / Waiting / Finished); a seeded fairness check of the dice and first-player helpers lives in `server` where they are.
- `server` (Workers runtime): joining picks a Current Player; only the Current Player's `roll` changes anything; a duplicate `roll` is refused; Turn alternates; a Token placed on Cell 29 wins on any Roll and further `roll`s are refused; an M2-shaped stored record is upgraded on load; positions survive eviction.
- `client`: reducer and panels (Turn line, Roll button visibility and disabling, keyboard, last-Turn text, Winner panel) in jsdom.
- `e2e`: the visual checks play a whole Match to a Winner with two browser contexts (pressing Roll on whichever page shows it, at most 300 presses) and check Tokens through `window.__board`; the production smoke test plays two Turns.

## Risks / Trade-offs

- [The Roll button could stay disabled if a request is dropped] → 3-second fallback re-enables it; refused Rolls are harmless to repeat.
- [Tokens jump instantly, so a Snake or Ladder is easy to miss] → the last-Turn text names the Jump; M4 adds animation.
- [A full game in the visual check takes a random number of Turns] → capped at 300 presses (a game almost always ends far sooner); fails clearly if the cap is hit.
- [The Match panel grows, so the Board gets less room on a phone] → keep Turn, last Turn and Roll on two short lines; check the phone screenshot.
- [Rolling back to M2 code after Finished Matches exist] → M2's snapshot schema does not know `finished` or the new fields, so those Matches would fail to display in M2; In-progress ones still work. Fix forward instead of rolling back.

## Migration Plan

No Durable Object migration. Stored records gain fields that are filled in on load (see above). Deploy as usual; Matches created by M2 (including the smoke-test ones) become playable from Start when next opened.
