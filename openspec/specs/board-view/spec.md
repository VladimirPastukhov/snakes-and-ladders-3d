# board-view Specification

## Purpose

Defines what a player sees of the Board: the 3D Yellow Brick Road with its numbered Cells, Regions, Snakes and Ladders, Tokens and landmarks, and how the player can move the camera.

## Requirements

### Requirement: Game page shows the Board in 3D
The game page SHALL fill the screen with a 3D scene of the Board. The game title and build version SHALL stay visible on top of the scene.

#### Scenario: Opening the game page
- **WHEN** a visitor opens the game page in a browser with 3D support
- **THEN** the 3D Board fills the window and the game title and build version are visible over it

#### Scenario: Production renders the Board
- **WHEN** the post-deploy smoke test opens the production game page
- **THEN** it confirms the 3D Board has finished drawing its first frame

### Requirement: Cells form one winding road from Start to the Final Cell
The 30 Cells SHALL be laid out in order along a single winding road that starts at a farmhouse landmark beside Start and ends at an Emerald City landmark beyond the Final Cell. Each Cell SHALL show its number, and the road SHALL never cross or overlap itself.

#### Scenario: Following the road
- **WHEN** a player traces the road from the farmhouse
- **THEN** they pass Cells 1, 2, 3 … 30 in order, each consecutive pair adjacent, and arrive at the Emerald City

#### Scenario: Cells never overlap
- **WHEN** any two Cells are compared
- **THEN** their slabs do not overlap

### Requirement: Regions are shown as coloured ground
Each Cell SHALL belong to exactly one Region, in the book's order, and the ground under each Region SHALL have its own colour:

| Region | Cells |
|---|---|
| Munchkin Country | 1–5 |
| Scarecrow's Cornfield | 6–10 |
| Dark Forest | 11–15 |
| Kalidah Ravine | 16–20 |
| River | 21–23 |
| Poppy Field | 24–29 |
| Emerald City | 30 |

#### Scenario: Region boundary
- **WHEN** a player looks at Cells 5 and 6
- **THEN** the ground under them has different colours

### Requirement: Snakes and Ladders are drawn as glowing arcs
Each Snake and Ladder SHALL be drawn as a glowing arc from its start Cell to its end Cell, with a marker showing which end is the destination. Ladders and Snakes SHALL use clearly different colours that do not rely on red/green alone.

#### Scenario: Reading a Ladder
- **WHEN** a player looks at the arc between Cells 3 and 11
- **THEN** it is in the Ladder colour and its destination marker is at Cell 11

#### Scenario: Reading a Snake
- **WHEN** a player looks at the arc between Cells 27 and 19
- **THEN** it is in the Snake colour and its destination marker is at Cell 19

### Requirement: Both Tokens wait at Start
The Board SHALL show two Tokens at Start, side by side without overlapping: orange for the Match creator and blue for the joiner.

#### Scenario: Initial Board
- **WHEN** the game page loads
- **THEN** an orange and a blue Token stand next to each other at Start, by the farmhouse

### Requirement: Camera frames the whole Board and allows limited movement
The initial view SHALL show all 30 Cells in portrait and landscape windows. Players SHALL be able to rotate and zoom with mouse or touch within limits that never show the Board from below or lose it from view.

#### Scenario: Phone in portrait
- **WHEN** the page opens in a 390 × 844 window
- **THEN** every Cell number from 1 to 30 is on screen without scrolling or zooming

#### Scenario: Window resized
- **WHEN** the window changes between portrait and landscape
- **THEN** the view re-frames so all 30 Cells are visible again

#### Scenario: Rotating too far
- **WHEN** a player drags to rotate past the allowed angle
- **THEN** the camera stops at the limit, still above the ground and facing the Board

### Requirement: Board stays smooth on a phone
Rotating and zooming the Board SHALL feel smooth on the project owner's phone.

#### Scenario: Orbiting on a phone
- **WHEN** the project owner rotates and pinch-zooms the Board on their phone
- **THEN** the motion has no visible stutter

### Requirement: Browsers without 3D get a clear message
If the browser cannot create a 3D context, the page SHALL show a short message explaining that the game needs 3D graphics, together with the title and build version, instead of a blank page.

#### Scenario: WebGL unavailable
- **WHEN** the game page opens in a browser where WebGL is disabled
- **THEN** the title, build version and a "this game needs 3D graphics" message are shown
