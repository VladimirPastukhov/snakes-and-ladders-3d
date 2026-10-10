# Spec Delta

## Purpose

Defines the one fixed Board every Match is played on: its Cells, where Tokens start and finish, and where each Snake and Ladder sends a Token.

## ADDED Requirements

### Requirement: Board has 30 Cells between Start and the Final Cell
The Board SHALL consist of Cells numbered 1 to 30. Start SHALL be the off-board position numbered 0, and the Final Cell SHALL be Cell 30.

#### Scenario: Cell numbering
- **WHEN** the Board is inspected
- **THEN** it has exactly 30 Cells, numbered 1 through 30 with no gaps, plus Start at 0

### Requirement: Ladders and Snakes are fixed
The Board SHALL have exactly these three Ladders and three Snakes, identical in every Match:

| Kind | From Cell | To Cell |
|---|---|---|
| Ladder | 3 | 11 |
| Ladder | 16 | 23 |
| Ladder | 24 | 29 |
| Snake | 18 | 8 |
| Snake | 22 | 13 |
| Snake | 27 | 19 |

#### Scenario: Landing on a Ladder's bottom Cell
- **WHEN** the Board is asked where a Token landing on Cell 16 ends up
- **THEN** the answer is Cell 23

#### Scenario: Landing on a Snake's head Cell
- **WHEN** the Board is asked where a Token landing on Cell 27 ends up
- **THEN** the answer is Cell 19

#### Scenario: Landing on an ordinary Cell
- **WHEN** the Board is asked where a Token landing on Cell 5 ends up
- **THEN** the answer is Cell 5

### Requirement: Snakes and Ladders never chain or touch the ends
Every Ladder SHALL lead to a higher Cell and every Snake to a lower one. No Snake or Ladder SHALL start or end at Start or on the Final Cell, no Cell SHALL start more than one, and no Snake or Ladder SHALL end on a Cell where another one starts.

#### Scenario: A single Jump is always final
- **WHEN** a Token's position is resolved through any Snake or Ladder
- **THEN** the resulting Cell is not the start of another Snake or Ladder

#### Scenario: Directions are consistent
- **WHEN** each connection is checked
- **THEN** every Ladder's end Cell is higher than its start Cell and every Snake's end Cell is lower than its start Cell
