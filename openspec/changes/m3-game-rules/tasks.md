# Tasks

## 1. Shared rules and protocol

- [x] 1.1 Add `shared/src/rules.ts` with `GameState`, `Turn`, `startGame(first)` and `takeTurn(state, seat, roll)`, with table tests for every `game-rules` scenario (plain Move, Ladder 3→11, Snake 27→19, shared Cell, six gives no extra Turn, exact win on 30, passing win from 28 with a 5, refused out of turn / while Waiting / after Finished); verify `pnpm test` passes
- [x] 1.2 Extend the snapshot (`positions`, `currentPlayer`, `winner`, `lastTurn`, phase `finished`) and the protocol (`roll` client message, `rolled` update event), with round-trip and rejection tests; verify `pnpm test` and `pnpm typecheck` pass

## 2. Server

- [x] 2.1 Add `server/src/dice.ts` (`rollDie`, `pickFirst`) using `crypto.getRandomValues` with rejection sampling, with tests that 6000 Rolls stay within 1–6 and each face appears 800–1200 times, and that both Seats are picked; verify tests pass
- [x] 2.2 Start the game when the joiner takes the Seat (random first Current Player, Tokens at Start) and handle `roll` in the Match Durable Object through `takeTurn`, broadcasting `rolled`; Workers-runtime tests: only the Current Player's Roll counts, a duplicate Roll is refused, the Turn alternates, positions move by 1–6 (or a Jump), and the snapshot reaches both sockets; verify tests pass
- [x] 2.3 Win and persistence: tests that a Token placed on Cell 29 (written to storage) wins on any Roll, the Match is Finished and later Rolls are refused; that positions and the Current Player survive eviction; and that an M2-shaped stored record is upgraded on load (Tokens at Start, a Current Player chosen); verify tests pass

## 3. Client

- [x] 3.1 Draw each Token on its Cell (Start before the first Move, side by side when sharing) from the snapshot, and expose `window.__board.tokens` as `{ seat, cell }[]`; verify the M2 visual checks still pass after updating them to the new shape
- [x] 3.2 Add the Turn line, the Roll button (Current Player only, disabled until the next snapshot with a 3-second fallback) and the Space/Enter shortcut (ignored in inputs and on buttons), with jsdom tests for both Players' views and the keyboard; verify tests pass
- [x] 3.3 Add the last-Turn text (`Alex rolled 3: Start → 3 → Ladder → 11`, `Sam rolled 2: 5 → 7`) and the Winner panel ("You win!" / "Alex wins", no Roll button, Back to home), with jsdom tests; verify tests pass and the phone screenshot still shows all 30 Cells above the panel

## 4. End-to-end checks

- [x] 4.1 Extend `pnpm visual`: two browser contexts play a whole Match to a Winner (press Roll on whichever page shows it, at most 300 presses); after every Roll both pages show the same last Turn and `window.__board.tokens` matches the snapshot positions; save screenshots mid-game and of both Winner screens; verify it passes
- [x] 4.2 Add two Turns to the production smoke test (the first Current Player rolls, both sessions show the result and the other Player's Turn, that Player rolls, the Turn comes back); verify `pnpm smoke` passes locally against `wrangler dev` with a built client

## 5. Docs

- [x] 5.1 Check `GLOSSARY.md` against the new specs (Turn, Current Player, Roll, Move, Jump, Winner, Match Phase "Finished") and fix any drift without adding implementation details; update `README.md` (the `roll` message and what a snapshot carries); verify `pnpm format:check` passes

## 6. Acceptance

- [ ] 6.1 Open the M3 pull request with screenshots from 4.1; verify CI is green
- [ ] 6.2 Owner plays a whole Match between the computer and the phone on the local network (`pnpm --filter server dev` + `pnpm --filter client dev --host`); verify the Roll button appears only on the Current Player's screen, both screens show each Turn, Tokens stand on the right Cells, and both screens announce the Winner

## Workflow follow-up

- Run `/opsx:archive` on this branch **before** merging, so one PR carries the code, the new `game-rules` and `match-play` specs, the updated `board-view` spec and the archived change.
- After merge, confirm the Deploy run is green including the two-Turn smoke check, and play one Match in production on the phone.
