# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Both Tokens wait at Start`
- TO: `### Requirement: Tokens appear for taken Seats`

## MODIFIED Requirements

### Requirement: Tokens appear for taken Seats
The Board SHALL show a Token at Start for each Seat that a Player holds: orange for the Match creator (Dorothy) and blue for the joiner (Scarecrow). With both Seats taken, the two Tokens SHALL stand side by side without overlapping. Outside a Match, the Board SHALL show no Tokens.

#### Scenario: Initial Board
- **WHEN** the game page loads on the home screen, outside any Match
- **THEN** the Board shows no Tokens

#### Scenario: Waiting for a friend
- **WHEN** the creator is alone in a Waiting Match
- **THEN** only the orange Token stands at Start, by the farmhouse

#### Scenario: Both Players seated
- **WHEN** the second Player joins
- **THEN** an orange and a blue Token stand next to each other at Start, on both Players' screens
