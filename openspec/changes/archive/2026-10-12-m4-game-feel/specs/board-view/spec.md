# Spec Delta

## MODIFIED Requirements

### Requirement: Snakes and Ladders are drawn as glowing arcs
Each Snake and Ladder SHALL be drawn as a glowing arc from its start Cell to its end Cell, with a marker showing which end is the destination. Its direction SHALL be readable anywhere along the arc: arrowheads along the arc SHALL point towards the destination, and the start Cell SHALL be ringed in the arc's colour. Ladders and Snakes SHALL use clearly different colours that do not rely on red/green alone.

#### Scenario: Reading a Ladder
- **WHEN** a player looks at the arc between Cells 3 and 11
- **THEN** it is in the Ladder colour and its destination marker is at Cell 11

#### Scenario: Reading a Snake
- **WHEN** a player looks at the arc between Cells 27 and 19
- **THEN** it is in the Snake colour and its destination marker is at Cell 19

#### Scenario: Reading the direction from the middle of an arc
- **WHEN** a player sees only the middle part of the arc between Cells 3 and 11
- **THEN** the arrowheads on it point towards Cell 11

#### Scenario: Where a Jump starts
- **WHEN** a player looks at Cells 3 and 11
- **THEN** Cell 3 is ringed in the Ladder colour and Cell 11 is not ringed, so landing on 3 climbs and landing on 11 does nothing

### Requirement: Tokens appear for taken Seats
The Board SHALL show a Token for each Seat that a Player holds: orange for the Match creator (Dorothy) and blue for the joiner (Scarecrow). Each Token SHALL stand on its Player's current Cell (Start before its first Move), reaching a new Cell through the Turn's animation, or straight away when the page opens or reconnects. Two Tokens on the same Cell or both at Start SHALL stand side by side without overlapping. Outside a Match, the Board SHALL show no Tokens.

#### Scenario: Initial Board
- **WHEN** the game page loads on the home screen, outside any Match
- **THEN** the Board shows no Tokens

#### Scenario: Waiting for a friend
- **WHEN** the creator is alone in a Waiting Match
- **THEN** only the orange Token stands at Start, by the farmhouse

#### Scenario: Both Players seated
- **WHEN** the second Player joins
- **THEN** an orange and a blue Token stand next to each other at Start, on both Players' screens

#### Scenario: Token follows the Turn
- **WHEN** Alex rolls 3 from Start and climbs the Ladder to Cell 11
- **THEN** on both screens, once the Turn's animation has finished, the orange Token stands on Cell 11 and the blue Token stays at Start

#### Scenario: Sharing a Cell
- **WHEN** both Tokens are on Cell 8
- **THEN** both stand on Cell 8, side by side, and both are visible

#### Scenario: Reopening mid-Match
- **WHEN** a Player reloads the page while their Token is on Cell 14
- **THEN** their Token appears on Cell 14 straight away, without hopping there from Start
