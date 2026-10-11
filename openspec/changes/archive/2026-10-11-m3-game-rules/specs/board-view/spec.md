# Spec Delta

## MODIFIED Requirements

### Requirement: Tokens appear for taken Seats
The Board SHALL show a Token for each Seat that a Player holds: orange for the Match creator (Dorothy) and blue for the joiner (Scarecrow). Each Token SHALL stand on its Player's current Cell, or at Start before its first Move, and SHALL move there as soon as a Turn is played. Two Tokens on the same Cell or both at Start SHALL stand side by side without overlapping. Outside a Match, the Board SHALL show no Tokens.

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
- **THEN** on both screens the orange Token stands on Cell 11 and the blue Token stays at Start

#### Scenario: Sharing a Cell
- **WHEN** both Tokens are on Cell 8
- **THEN** both stand on Cell 8, side by side, and both are visible
