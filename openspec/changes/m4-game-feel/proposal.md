# Proposal

## Why

M3 made the game playable, but a Turn happens in one frame: the Token teleports to its new Cell and the panel already shows the result. A Snake or Ladder is easy to miss, and nothing builds suspense while the die is in the air. M4 makes each Turn readable and fun to watch, without changing the rules or the server.

## What Changes

- **Dice tumble:** after a Roll, a 3D die is thrown onto the Board beside the rolling Token. It tumbles for about a second and comes to rest with the rolled number facing up, on both screens.
- **Cell-by-cell hops:** the Token then hops along the road one Cell at a time, so a 4 is four visible hops. A Move that would pass the Final Cell stops there.
- **Generic Jump flight:** when the Move ends on a Snake or Ladder, the Token flies along that Snake's or Ladder's glowing arc to its destination Cell. Ladders and Snakes look the same here; themed Jumps are M5.
- **Follow camera:** during the animation the camera glides closer and follows the moving Token, then glides back to the whole-Board view. If a Player drags or zooms meanwhile, following stops for the rest of that Turn.
- **Hold the result until the animation ends:** the last-Turn line, the "Your Turn" / "<name>'s Turn" line, the Roll button and the Winner banner change only once the Turn's animation has finished. This changes the M3 promise "within 2 seconds both screens show the result": the die must start tumbling within 1 second and both screens must have settled within 6 seconds.
- **No animation when it would not help:**
  - opening or reconnecting to a Match places Tokens straight on their Cells (no replay);
  - when the device asks for reduced motion, the die shows its number without tumbling, Tokens move straight to their Cell and the camera stays still;
  - Turns that arrived while the tab was hidden snap into place when it becomes visible again.
- The server and protocol stay as they are: the server never waits for animations (project constraint), and every animation is derived from the Turn already in each snapshot.

Out of scope: Event Names, character Tokens and themed Jumps (M5); sound; a setting to switch the follow camera off; Rematch and timers (M6).

## Capabilities

### New Capabilities
- `turn-animation`: how a played Turn is shown on the Board, covering the die tumble, hops, Jump flight, follow camera, and when animation is skipped.

### Modified Capabilities
- `board-view`: Tokens no longer move "as soon as a Turn is played". They reach their new Cell through the Turn's animation, and stand still where they are on load or reconnect.
- `match-play`: Turn text, Roll button and Winner announcement update only when the Turn's animation has finished, and the timing promise moves from "within 2 seconds" to "starts within 1 s, settled within 6 s".

## Impact

- **Client only:**
  - `client/src/board/` gets a die, an animated Token path built from the Turn, and a follow mode for the camera rig.
  - `client/src/screens/PlayControls.tsx` and `App.tsx` show the "presented" snapshot (what the animation has reached) instead of the latest one.
- **Shared:** unchanged. The Turn's `from`, `landed`, `to` and `jump` already describe every step, and the Board's `JUMPS` and road positions give the path.
- **Server and protocol:** unchanged, so no Durable Object migration is involved.
- **Tests:**
  - New unit tests for the hop/flight path and the playback queue.
  - The smoke test and the visual checks wait for the animation. The long `play.visual.ts` game uses reduced motion to stay fast.
  - A new visual check catches a die and Token mid-animation.
- **Dependencies:** none. Animation uses R3F's `useFrame`, with no physics engine.
- **Performance:** the canvas stays `frameloop="demand"` and draws continuously only while an animation plays.
