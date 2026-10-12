# Tasks

## 1. Playback model

- [x] 1.1 Record how each snapshot arrived (`arrival: "welcome" | <update event>`) in the match reducer, with reducer tests for welcome, rolled and presence updates; verify `pnpm test` passes
- [x] 1.2 Add `client/src/match/playback.ts` and a `usePlayback` hook. The hook keeps `shown`, the queue and the playing Turn, and finishes a Turn with a timer of the timeline's duration. Unit tests (fake timers):
  - welcome shows at once; `rolled` queues and reveals on finish;
  - two quick Turns play in order;
  - presence and rename pass straight into `shown`;
  - a reconnect clears the queue;
  - reduced motion and a hidden document apply at once, and hiding mid-Turn flushes.

  Verify `pnpm test` passes.

## 2. Turn motion

- [x] 2.1 Add `client/src/board/turnMotion.ts` (timeline with tumble 900 ms, 280 ms per hop, 150 ms pause, 900 ms flight; `tokenAt`, `dieAt`). Unit tests:
  - one hop per Cell, each ending on the Seat's spot of that Cell;
  - Start → Cell 1;
  - 28 + 5 stops at 30;
  - the flight ends on the Jump's destination spot and passes near the arc's peak;
  - a 6 ending on a Snake lasts ≤ 5 s;
  - the die's resting top face equals the Roll for every value 1–6.

  Verify `pnpm test` passes.
- [x] 2.2 Draw the motion: a code-built `Die` (rounded cube with pips), `Tokens` drawing the moving Seat from `tokenAt`, and a `TurnPlayer` that animates and calls `invalidate()` only while a Turn plays. Wire `shown` and `playing` from `App` into `BoardScene`. Extend `window.__board` with `animating`, `die` and `following`. Verify with `pnpm typecheck` and the existing visual checks.

## 3. Follow camera

- [x] 3.1 Add follow mode to `CameraRig`:
  - it eases the target towards the moving Token and die, and the distance to 0.55× the overview, at the current angles;
  - it glides back to the overview fit afterwards;
  - an OrbitControls `start` event stops following for the rest of the Turn;
  - there is no follow mode under reduced motion.

  Unit-test the pure easing and the "taken over" decision. Verify `pnpm test` passes and, in `pnpm dev`, a Turn zooms in and returns.

- [x] 3.2 Make each Snake's and Ladder's direction obvious: arrowheads spaced along every arc, pointing along it towards the destination, and a ring in the arc's colour around the start Cell. Unit-test the arrowhead placement (evenly spaced, each pointing along the arc's tangent, none on the end Cells). Verify `pnpm test` passes and the phone screenshot reads clearly with all 30 Cell numbers still visible.

## 4. Panel reveal

- [x] 4.1 Pass `shown` to `MatchPanel` and add a `busy` flag to `PlayControls`. Roll is enabled only on your Turn in `shown` and not busy; Space/Enter follow the same rule; the 3 s fallback watches the latest snapshot. jsdom tests:
  - the old Turn line and last Turn stay while busy;
  - Roll stays disabled past 3 s while busy;
  - the Winner is not announced until the winning Turn is revealed;
  - reduced motion reveals at once.

  Verify `pnpm test` passes.

## 5. End-to-end checks

- [x] 5.1 Add `e2e/visual/animation.visual.ts` with three cases:
  - **One Roll with motion:** `animating` becomes true, `following` is true, and the panel still shows the previous Turn line. Save a mid-tumble screenshot at phone size. Afterwards the camera is back at the overview distance with all 30 Cells on screen, the die's value matches the last-Turn text, and Tokens match it.
  - **Reload mid-Match:** `animating` never becomes true.
  - **Reduced-motion context:** nothing animates and the panel updates at once.

  Verify it passes.
- [x] 5.2 Run `play.visual.ts` in reduced-motion contexts so the full game stays fast, and raise the smoke test's per-Turn expectations to 10 s with real motion. Verify `pnpm visual` passes and `pnpm smoke` passes locally against `wrangler dev` with a built client.

## 6. Docs

- [x] 6.1 Update `README.md`:
  - how a Turn is shown: die, hops, Jump flight, follow camera;
  - when animation is skipped: reload/reconnect, reduced motion, hidden tab;
  - the new `window.__board` fields.

  Check `GLOSSARY.md` against the new specs and keep it free of implementation terms. Verify `pnpm format:check` passes.

## 7. Acceptance

- [x] 7.1 Open the M4 pull request with the mid-animation screenshots from 5.1; verify CI is green
- [x] 7.2 Owner plays a Match between the computer and the phone on the local network. Verify that:
  - the die tumbles and lands on the rolled number;
  - Tokens hop and fly along a Snake or Ladder;
  - the camera follows and returns, and dragging stops it;
  - the panel reveals each result only after the animation;
  - the motion feels smooth on the phone.

## Workflow follow-up

- Run `/opsx:archive` on this branch before merging, so one PR carries the code, the new `turn-animation` spec, the updated `board-view` and `match-play` specs, and the archived change.
- After merge, confirm the Deploy run is green, including the smoke test, and play one Match in production on the phone.
