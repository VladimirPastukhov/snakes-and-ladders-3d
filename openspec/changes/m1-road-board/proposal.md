# Proposal

## Why

Production currently shows a text placeholder. Every later milestone (Match system, rules, game feel, Oz art) needs a Board to put Tokens on, and the rules need one fixed definition of where the Snakes and Ladders are. M1 makes the Yellow Brick Road Board real: one shared definition of the Board, drawn in 3D, readable on a phone, before any networking exists.

## What Changes

- Add the single definition of the Board to the shared code: 30 Cells, Start (cell 0), the Final Cell, and the six Snakes and Ladders with their cells. The future rules engine and the 3D view both read it.
- Add the Oz presentation data next to the view: the Regions (which Cells belong to which story Region) and the Event Name of each Snake and Ladder. The rules definition stays theme-free.
- Replace the text placeholder with a full-screen 3D diorama: a winding yellow-brick road from Dorothy's farmhouse (placeholder block) at Start to the Emerald City (placeholder block) at the Final Cell, with 30 numbered Cells, Regions as coloured ground zones, and each Snake and Ladder drawn as a glowing arc from its start Cell to its end Cell.
- Place both Tokens (placeholder pieces in the two Player colours) at Start.
- Add a camera that frames the whole Board in portrait and landscape and allows limited orbit and zoom, by mouse or touch.
- Keep the game title and build version visible on top of the scene, and show a plain message instead of a blank page when the browser cannot do 3D.
- Extend the post-deploy smoke test so production must actually render the Board.

Out of scope: Matches, networking, Rolls and Moves, animation, camera following, character models, scenery and themed set pieces (M5), sound.

## Capabilities

### New Capabilities

- `board-layout`: the fixed Board every Match is played on: its Cells, Start, Final Cell, and where each Snake and Ladder leads.
- `board-view`: what a player sees of the Board: the 3D road with numbered Cells, Regions, Snakes and Ladders, Tokens, landmarks, and how the camera can be moved.

### Modified Capabilities

(none) The `app-hosting` requirements still hold as written: the page keeps showing the title and build version, and deep links still load it. The smoke test's new board check is a `board-view` scenario, not a change to `delivery-pipeline`.

## Impact

- `shared/`: new Board definition and its tests.
- `client/`: new dependencies `three`, `@react-three/fiber`, `@react-three/drei`; new board scene components, Oz presentation data, a self-hosted font for Cell numbers; the page becomes full-screen 3D. The client bundle grows by roughly 200 KB gzipped.
- `e2e/`: smoke test gains a board-rendered check.
- No server, protocol or infrastructure changes. Cost stays $0.
