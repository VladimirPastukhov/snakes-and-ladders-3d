# Tasks

## 1. Board definition

- [x] 1.1 Add `shared/src/board.ts` (`CELL_COUNT`, `START`, the six Snakes and Ladders, `resolveJump`) exported from `@sl/shared`, with Vitest tests for every `board-layout` scenario (numbering, 16→23, 27→19, 5→5, no chains, no ends touched, directions); verify `pnpm test` passes

## 2. Dependencies and Oz presentation data

- [x] 2.1 Add `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three` and `@fontsource/fredoka` to `client/`; verify `pnpm build` succeeds and record the gzipped bundle size from the build output
- [x] 2.2 Add `client/src/board/oz.ts` (Regions with Cell ranges and ground colours, Event Names keyed by start Cell) with tests that every Cell 1–30 is in exactly one Region in book order and every Snake and Ladder has an Event Name; verify tests pass

## 3. Geometry

- [x] 3.1 Add `client/src/board/road.ts` (control points → curve → Start, 30 Cells and the Emerald City position, each with a tangent) with tests for even spacing between consecutive Cells, no overlap between non-consecutive Cells, and fitting the target rectangle; verify tests pass
- [x] 3.2 Add `client/src/board/camera.ts` (fit distance from bounding box, field of view and aspect) with tests that all Cells fit at 390 × 844 and 1440 × 900; verify tests pass

## 4. Scene

- [x] 4.1 Add the WebGL check, the fallback message and the full-screen layout with the title/version overlay; verify the existing App test still passes and a new test covers the fallback message in jsdom
- [x] 4.2 Add the canvas (`frameloop="demand"`, DPR ≤ 2), Region ground discs and Cell slabs with numbers in the bundled Fredoka font; verify in `pnpm dev` that the road and all 30 numbers render and the network tab shows no font requests to other hosts
- [x] 4.3 Add Snake and Ladder arcs with destination cones, invisible thicker hit tubes, and Event Name labels on hover/tap; verify in `pnpm dev` that hovering 27→19 shows "Deadly Poppies" and clicking empty space hides it
- [x] 4.4 Add both Tokens at Start and the farmhouse and Emerald City placeholder landmarks; verify in `pnpm dev`
- [x] 4.5 Add orbit controls with the angle, zoom and no-pan limits and re-framing on resize; verify in `pnpm dev` that dragging stops at the limits and resizing between portrait and landscape keeps all Cells visible
- [x] 4.6 Set `data-board-ready="true"` on the scene container after the first frame; verify it appears in `pnpm dev`
- [x] 4.7 Add a development-only debug hook `window.__board` behind `import.meta.env.DEV`: each Cell's screen position in CSS pixels and whether it is inside the window, the camera's angle and distance, each arc's screen-space midpoint, and the selected arc's Event Name; verify it exists in `pnpm dev` and that `grep -r "__board" client/dist` finds nothing after `pnpm build`

## 5. Smoke test

- [x] 5.1 Launch Playwright Chromium with `--enable-unsafe-swiftshader` and add a smoke check that `data-board-ready="true"` appears on the game page; verify `pnpm smoke` passes locally against `wrangler dev` with a built client

## 6. Visual review and docs

- [x] 6.1 Add a Playwright visual-check script run against `pnpm dev` (not part of the smoke test) that, at 390 × 844 and 1440 × 900, asserts via `window.__board` that all 30 Cells are inside the window, hovers the 27→19 arc at its reported midpoint and asserts "Deadly Poppies" is shown, and saves screenshots; verify it passes and review the screenshots against the `board-view` scenarios (Regions distinct, arc colours and destination markers, Tokens at Start, landmarks), then attach them to the PR
- [x] 6.2 Update `README.md` where it describes the client (now a 3D Board, needs WebGL); verify `pnpm format:check` passes

## 7. Acceptance

- [x] 7.1 Open the M1 pull request; verify CI is green
- [ ] 7.2 Owner opens the PR build (local `pnpm dev` reachable from the phone, or production after merge) on their phone; verify all 30 numbers are visible in portrait, rotating and pinch-zooming has no visible stutter, and tapping an arc shows its Event Name

## Workflow follow-up

- Run `/opsx:archive` on the same branch before merging, so the PR carries the code, the new `board-layout` and `board-view` specs and the archived change together.
- After merge, confirm the Deploy run is green, including the new board-ready smoke check.
