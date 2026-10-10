# Design

## Context

After M0 the client is a Vite + React page (`client/src/App.tsx`) showing title and version; `shared/` (`@sl/shared`) only exports `GAME_TITLE`; the Worker serves `client/dist` and needs no change. Tests: Vitest with jsdom in the client (no WebGL there), Workers runtime tests in the server, and a Playwright smoke test that runs headless Chromium against production. Requirements: `specs/board-layout`, `specs/board-view`.

## Goals / Non-Goals

**Goals:**
- One Board definition in `shared/` that M3's rules engine will import unchanged.
- All geometry (where Cells, arcs and landmarks sit) computed by pure, unit-tested functions; React components only draw what those functions return.
- A scene cheap enough for a phone: a few hundred draw calls at most, no post-processing, rendering only when something changes.

**Non-Goals:**
- Animation, Token movement, camera follow (M4); imported models, scenery, themed Jump effects (M5).
- Snapshot or pixel-comparison tests of the 3D scene. GPU and driver differences make them flaky; geometry is tested as numbers and the picture is checked by eye.

## Decisions

### Board definition in `shared/`, theme in `client/`
`shared/src/board.ts` exports the rules-level Board: `CELL_COUNT = 30`, `START = 0`, the list of Snakes and Ladders as `{ kind: "ladder" | "snake", from, to }`, and `resolveJump(cell) → cell`. It contains no Oz words, so the rules never depend on the theme.
`client/src/board/oz.ts` holds the presentation data: the Regions (name, Cell range, ground colour) and the scene colours. A unit test checks that every Cell 1–30 is in exactly one Region, so the two files cannot drift apart.
*Alternative:* one combined file in `shared/`. Rejected: the server would ship Oz data it never uses, and re-theming would touch rules code.

### Road shape: hand-placed control points, cells sampled by distance
`client/src/board/road.ts` builds a `CatmullRomCurve3` through about ten hand-placed control points that zig-zag up a tall rectangle (about 10 × 18 world units, matching a portrait screen). Positions are sampled at equal arc-length steps: step 0 is Start, steps 1–30 are the Cells, and the Emerald City sits one step past Cell 30. Each sample also gets the curve's tangent so a Cell slab can be rotated to follow the road.
Unit tests on the returned numbers enforce the spec: consecutive Cells are an even distance apart, no two non-consecutive Cells are closer than one slab width plus a margin (so the road never overlaps itself), and the whole road fits the target rectangle.
*Alternative:* a grid bent into a path. Rejected: it would look like a grid, which is what we decided against.

### Drawing the scene with React Three Fiber
- **Canvas:** `frameloop="demand"` (draws only after input or resize, which saves phone battery), device pixel ratio capped at 2, no shadows, no post-processing.
- **Ground:** each Region is a set of flat discs centred under its Cells in the Region's colour, sitting slightly above a neutral base plane. Overlapping discs of one colour read as a soft organic patch, with no polygon maths needed.
- **Cells:** a round, low-poly yellow slab (a short cylinder, like a flagstone) per Cell, with its number from drei `<Text>` lying on top, turned to read along the road.
  *Changed during implementation:* square slabs turned to the road clipped each other's corners at the hairpin turns (caught by the overlap test). Shrinking them enough made the Cells too small to read, and round slabs have no corners to clip.
- **Snakes and Ladders:** a tube along a quadratic Bézier from the start Cell to the end Cell, arching higher for longer jumps, with a cone at the destination. A `toneMapped={false}` unlit material in a bright colour gives the "glow" without bloom. Ladders are cyan and Snakes magenta: distinct for the common colour-vision deficiencies and different from the yellow road.
- **Event Names:** not shown. An earlier draft showed them on hover or tap; removed during review as redundant, since the arc colours already say Snake or Ladder.
- **Tokens:** a low-poly pawn (cylinder plus sphere) in Okabe–Ito orange (creator) and blue (joiner), placed either side of the Start position.
- **Landmarks:** a box-and-roof farmhouse beside Start and a cluster of green boxes for the Emerald City, both placeholders until M5.
- **Overlay:** title and version stay in normal HTML positioned over the canvas, so the existing app-hosting behaviour and its tests are unchanged.

### Self-hosted font for Cell numbers
drei `<Text>` downloads a default font from a public CDN when none is given. We bundle a `.woff` file of an OFL-licensed rounded font (Fredoka, from `@fontsource`) through Vite instead, so the game makes no third-party requests and works the same offline in development. `.woff` rather than `.woff2` because the text renderer (troika) does not read `.woff2`.

### Camera framing
`client/src/board/camera.ts` has a pure function that takes the Board's bounding box, the field of view and the window's aspect ratio and returns the camera distance that fits every Cell with a margin. It is unit-tested for portrait (390 × 844) and landscape (1440 × 900). The scene recalculates it on resize. drei `<OrbitControls>` limits the vertical angle (never below about 25° above the ground), limits the horizontal angle to about ±35° around the default view, disables panning, and bounds zoom between about 0.5 and 1.3 times the fit distance. Touch rotate and pinch-zoom come from the same controls.

### WebGL check and the "ready" signal
Before mounting the canvas, the app tries `canvas.getContext("webgl2") ?? getContext("webgl")`. If both fail it renders the fallback message instead. jsdom has no WebGL, so the existing client unit test naturally covers the fallback path, and a new test covers the message text.
After the first frame is drawn, the scene sets `data-board-ready="true"` on its container. The smoke test waits for that attribute, which is the observable proof that production renders the Board.

### Development-only debug hook
A 3D canvas is opaque to browser automation: the page structure shows a single `<canvas>`. In development builds the scene publishes its facts on `window.__board` (each Cell's projected screen position and whether it is on screen, camera angle and distance, each arc's screen midpoint). It is updated after every rendered frame. A Playwright visual-check script and browser tools use it to assert "all 30 Cells visible" as numbers instead of judging screenshots by eye.
It is wrapped in `if (import.meta.env.DEV)`, so Vite strips it from production builds. It exposes nothing secret (the server will own all game state), but production players gain nothing from it either, and keeping it out of production leaves its shape free to change without a spec change. Consequence: hook-based checks run against `pnpm dev`; the production smoke test keeps checking only `data-board-ready`.
*Alternative:* enable it in production behind a `?debug` query parameter. Deferred until a production-only problem needs it.

### WebGL in CI's headless Chromium
GitHub's runners have no GPU, and current Chrome no longer falls back to software WebGL by itself. The Playwright config launches Chromium with `--enable-unsafe-swiftshader` (Chrome's software renderer), which is fine for a test browser that only visits our own site.

## Risks / Trade-offs

- [Client bundle grows to about 360 KB gzipped, from 69 KB] → Measured during apply; the earlier estimate of +200 KB was wrong. React Three Fiber imports all of three.js so any three.js class can be used as a JSX element, which defeats tree-shaking; drei itself adds only about 5 KB. Accepted for a game (about one extra second on 4G). Shrinking it substantially would mean dropping React Three Fiber, which reverses the stack decision; revisit only if load time becomes a real complaint.
- [The road looks wrong even though the geometry tests pass] → Screenshots at 390 × 844 and 1440 × 900 are reviewed during apply, and the owner checks on their phone before merging.
- [Software WebGL in CI is slow] → The smoke test only waits for the first frame; nothing animates.

## Migration Plan

Ships like M0: merge to `main`, automatic deploy, smoke test now includes the board-ready check. Rollback with `wrangler rollback` or a revert; no data or server state is involved.
