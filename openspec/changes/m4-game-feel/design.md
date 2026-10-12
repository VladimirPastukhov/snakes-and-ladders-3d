# Design

## Context

- **Client after M3:**
  - `useMatch` turns server messages into `{ status, you, match }`. Here `match` is always the latest snapshot.
  - `App` turns `match.positions` into `TokenSpot[]` (`{ seat, cell }`), and `BoardScene` draws them with `Tokens` in `client/src/board/scenery.tsx`.
- **Snapshot data:** every `rolled` snapshot carries `lastTurn = { seat, roll, from, landed, to, jump }`, which is everything an animation needs.
- **Board geometry:**
  - `buildRoad()` gives each Cell's position and tangent, plus Start.
  - `buildArcs()` gives each Snake and Ladder a `QuadraticBezierCurve3`.
- **Camera:** `CameraRig` fits the whole Board with `fitCamera` and lets drei `OrbitControls` rotate and zoom within limits.
- **Rendering:** the canvas uses `frameloop="demand"`, so it only draws when something calls `invalidate()`.
- **Panel:** `PlayControls` disables Roll until a new snapshot arrives, with a 3 s fallback.
- **Requirements:**
  - `specs/turn-animation`
  - the modified Tokens requirement in `specs/board-view`
  - the Roll requirement and the reveal requirement in `specs/match-play`

## Goals / Non-Goals

**Goals:**
- One small, pure "playback" model that decides what each screen *shows* (snapshot plus the Turn being animated). It is unit-tested without WebGL.
- Animation poses (die, Token, camera target) are pure functions of a Turn and elapsed time, so they are unit-testable and give the same picture on any frame rate.
- No change to `shared/`, the server or the protocol.

**Non-Goals:**
- Physics: the die follows a scripted tumble, not a simulation.
- Making both screens frame-synchronised. Each screen animates on its own clock from the moment the snapshot arrives.
- Themed per-Event Jumps, character models and sound (M5/M7).

## Decisions

### Shown snapshot vs latest snapshot ("playback")
A new pure module `client/src/match/playback.ts` holds `{ shown, queue, playing }`, where `playing` is `{ turn, target, startedAt } | null`. The rules:

**How each kind of message is handled:**
- `welcome`, which also covers the first load and every reconnect: `shown = latest`, the queue is cleared and nothing plays. This is the "no replay" rule.
- `update` with event `rolled`: the new snapshot is queued as a target. If nothing is playing, the next target starts playing.
- Any other `update` (`joined`, `connected`, `disconnected`, `renamed`): seats and presence are copied into `shown` straight away. Positions, Turn and Winner are left alone, so presence never waits for an animation.

**When a Turn finishes:** `shown` becomes the finished target, with the latest seats, and the next queued target starts. The 5-second limit makes the finish time known in advance, so `usePlayback` uses a `setTimeout(duration)` for it rather than waiting for the renderer. This keeps the panel correct in jsdom, without WebGL, and on a slow GPU.

**When playback is instant:**
- Reduced motion (`matchMedia("(prefers-reduced-motion: reduce)")`) or a hidden document: targets apply immediately, as if their duration were 0.
- A `visibilitychange` to hidden while a Turn is playing finishes everything queued at once.

To know which event produced a snapshot, `MatchState` records `arrival: "welcome" | UpdateEvent` from the reducer.

*Alternative:* let the Board call `onFinished` when its animation ends. Rejected: it would tie the panel to rendering, break when WebGL is missing, and stall in background tabs where `requestAnimationFrame` stops.

### Turn timeline as pure functions
`client/src/board/turnMotion.ts` builds a timeline from a Turn and the road. It has four phases:

| Phase | Duration |
|---|---|
| tumble | 900 ms |
| hops | 280 ms per Cell moved, from `from` to `landed` |
| pause | 150 ms (only before a Jump) |
| flight | 900 ms, along the Jump arc to `to` |

The worst case is 900 + 6 × 280 + 150 + 900 = 3,630 ms, well under the 5 s limit.

**Pose functions:**
- **`tokenAt(timeline, t)`** returns the moving Token's position and the last Cell reached.
  - *Hops:* each hop is a parabola (peak 0.35) between two consecutive Token spots. A spot uses the same per-Seat side offset as `Tokens`, so the Token lands exactly where it would stand.
  - *Start:* from Start, the first hop rises from the ground to the slab.
  - *Flight:* the flight is a quadratic Bézier from the landed spot to the destination spot, using the Snake's or Ladder's own arc peak as its control point, so the Token traces the drawn arc.
  - *Easing:* each segment eases in and out.
- **`dieAt(timeline, t)`** returns the die's position and orientation.
  - *Drop:* it falls from above the `from` Cell to a resting spot beside it, on the side away from the road's next Cell, so it never covers the hops.
  - *Spin:* during the tumble it spins about a fixed tilted axis with decaying speed, and the last 30% slerps into the resting orientation for the rolled value.
  - *Face table:* a table maps each value 1–6 to the rotation that puts that face up. A unit test checks the top face for every value.

After the timeline, both functions return the resting pose.

### Drawing
- `Tokens` takes an optional `moving: { seat, position }`, and that Seat's Pawn is drawn there instead of on its Cell.
- A new `Die` component draws a rounded cube (drei `RoundedBox`) with dark pip discs on each face, made in code with no asset files. It is about 0.35 units, large enough to read on a phone in the follow view.
  - While a Turn plays, it draws the `dieAt` pose.
  - At rest, it shows the last Roll beside the last Turn's `from` Cell.
  - With no last Turn, it is hidden.
- A `TurnPlayer` component inside the canvas reads `playing` and the elapsed time. Each frame it updates the Pawn and die, and calls `invalidate()` while a Turn is playing, so the demand frameloop only runs continuously during animation.

### Follow camera
`CameraRig` gains a follow mode driven by `playing`:
- **Follow goal:** each frame, the rig frames the moving Token and the die (with some room around each) using `fitCamera` at the current polar and azimuth angles, so the follow view keeps the Player's chosen angle. The distance is never closer than 0.55 × the overview and never further than the overview: a short Move zooms right in, and a long Move pulls back just enough to keep both on screen.
- **Easing:** the orbit target and distance ease towards that goal with exponential damping (rate 6/s), fast enough that a hopping Token is not left at the screen edge.
- **Return:** when `playing` becomes null, the target and distance ease back to the overview fit, and following stops once it is reached.
- **Player takes over:** OrbitControls' `start` event (the Player begins a drag or pinch) marks the current Turn as "taken over". The rig then stops following and does not return to the overview until the next Turn starts.
- **Reduced motion:** the rig never enters follow mode.

*Alternative:* a separate follow camera that switches cuts. Rejected: cuts are disorienting on a phone, and two cameras would duplicate the fit and limits logic.

### Panel and Roll button
- **What the panel shows:** `App` passes `shown`, not `latest`, to `MatchPanel` and the Board. A Seat's Token appears as soon as the Seat is taken, because `shown` gets seat changes at once.
- **When Roll is enabled:** `PlayControls` gets a `busy` flag (a Turn playing or queued), and Roll is enabled only when it is your Turn in `shown` and `!busy`.
- **Fallback timer:** the 3-second retry fallback now watches the *latest* snapshot. A slow animation can then never re-enable Roll early, and a lost request still recovers.
- **Keyboard:** Space and Enter follow the same `canRoll`.
- **Steady panel height:** the Turn row is as tall as the Roll button whether or not the button is shown. Otherwise the canvas would resize every Turn, and a resize re-fits the camera, which would cut the glide back short and undo a Player's drag.
- **Sharing per-frame state:** the moving Token's position, the die's position and the follow flag change every frame. They live in a ref shared by `TurnPlayer`, `CameraRig` and the debug hook, not in React state.

### Development hook
`window.__board` gains:
- `animating: boolean`
- `die: { value, x, y } | null`, with the value and screen position of the resting die
- `following: boolean`

`tokens` keeps reporting `{ seat, cell }`. For the moving Token, `cell` is the last Cell reached so far, so tests can wait for `animating === false` and then compare cells as today.

### Testing
- **Unit, client:**
  - **playback:** welcome shows instantly; `rolled` queues; presence passes straight through; finish reveals; order is kept; hidden or reduced motion apply instantly; a reconnect clears the queue.
  - **turnMotion:**
    - number of hops and their end spots;
    - Start to Cell 1;
    - stopping at 30;
    - the flight ends on the destination;
    - the worst case stays ≤ 5 s;
    - the die's top face matches every value.
  - **PlayControls:** Roll is disabled while busy, and the fallback is tied to the latest snapshot.
- **Visual, against `pnpm dev`:**
  - A new `animation.visual.ts` rolls once with motion on. It checks that `animating` turns true, that the panel still shows the old Turn line, and that `following` is true. It captures a mid-tumble screenshot, then checks that the camera returns to the overview distance and the die shows the Roll from the last-Turn text.
  - A second test reloads mid-Match and checks that `animating` stays false.
  - A third uses a reduced-motion context and checks that nothing animates.
- **Long game:** `play.visual.ts` runs with `reducedMotion: "reduce"` so the 300-press cap stays fast.
- **Smoke:** the smoke test keeps real motion, raises its per-Turn expectations to 10 s, and so proves animations finish in production.

## Risks / Trade-offs

- **The screens drift apart by up to the network delay.** → Accepted. Each screen reveals when its own animation ends, and Roll waits for the roller's own screen.
- **`setTimeout` and the frame clock disagree, so the panel reveals a frame before the Token lands.** → Both use `performance.now()` from the same `startedAt`, and `TurnPlayer` clamps to the resting pose at `t ≥ duration`.
- **The follow camera feels busy or causes motion discomfort.** → Moderate zoom (0.55×), damped easing, a single return glide, and a full opt-out through reduced motion.
- **Software-rendered CI (SwiftShader) runs at a low frame rate.** → Poses depend on time, not frame count, and the reveal does not depend on frames.
- **A fast opponent fills the queue.** → Rolls only unlock after the roller's own playback, so the queue rarely holds more than one Turn. Hidden tabs flush it.

## Migration Plan

Client-only change, deployed by the normal pipeline. Rolling back means reverting the PR. There is no stored data or protocol change, so old and new clients can share a Match during a deploy.
