# game-rules Specification

## Purpose

Defines how a Match is played once both Players are seated: who goes first, what a Turn does, how Rolls, Moves and Jumps change Token positions, and how the Match ends with a Winner. The server decides every outcome; the rules do not depend on how the game is drawn.

## Requirements

### Requirement: The first Current Player is chosen at random
When the second Player joins and the Match becomes In progress, the server SHALL choose the first Current Player at random, with an equal chance for each Seat. Both Tokens SHALL start at Start.

#### Scenario: Match starts
- **WHEN** Sam joins Alex's Waiting Match
- **THEN** the Match is In progress, both Tokens are at Start, and exactly one of Alex or Sam is the Current Player

#### Scenario: Fair choice
- **WHEN** many Matches are started
- **THEN** the creator and the joiner each go first in about half of them

### Requirement: Only the Current Player can Roll
A Roll SHALL be accepted only from the Current Player of an In-progress Match. A Roll request from the other Player, before the Match is In progress, or after it is Finished SHALL be ignored and SHALL NOT change the Match.

#### Scenario: Out of turn
- **WHEN** Sam asks to Roll while it is Alex's Turn
- **THEN** nothing changes, and it is still Alex's Turn

#### Scenario: Two quick presses
- **WHEN** Alex's Roll request arrives twice in quick succession
- **THEN** only the first is played, and the Turn passes to Sam

### Requirement: The server throws the die
Each accepted Roll SHALL be a whole number from 1 to 6, chosen by the server with an equal chance for each number. Players SHALL NOT be able to choose or influence it.

#### Scenario: Range
- **WHEN** many Rolls are played
- **THEN** every result is between 1 and 6, and each number appears about equally often

### Requirement: A Turn is Roll, Move, then any Jump
After a Roll, the Current Player's Token SHALL Move forward by the rolled number of Cells. If it lands on the bottom of a Ladder or the head of a Snake, it SHALL then Jump to that connection's other end. The Turn SHALL then pass to the other Player. Rolling a 6 SHALL NOT give an extra Turn. Tokens MAY share a Cell and SHALL NOT affect each other.

#### Scenario: Plain Move
- **WHEN** Alex's Token is on Cell 5 and Alex rolls 3
- **THEN** Alex's Token is on Cell 8 and it is Sam's Turn

#### Scenario: Ladder
- **WHEN** Alex's Token is at Start and Alex rolls 3
- **THEN** the Token Moves to Cell 3, climbs the Ladder to Cell 11, and it is Sam's Turn

#### Scenario: Snake
- **WHEN** Sam's Token is on Cell 21 and Sam rolls 6
- **THEN** the Token Moves to Cell 27, slides down the Snake to Cell 19, and it is Alex's Turn

#### Scenario: Sharing a Cell
- **WHEN** Sam's Token Moves to the Cell where Alex's Token stands
- **THEN** both Tokens are on that Cell and neither is moved back

#### Scenario: A six is just a six
- **WHEN** Alex rolls 6
- **THEN** after the Move it is Sam's Turn

### Requirement: Reaching or passing the Final Cell wins
A Player whose Token reaches or passes the Final Cell SHALL be the Winner: their Token SHALL stand on the Final Cell, the Match SHALL become Finished, and there SHALL be no further Turns.

#### Scenario: Exact landing
- **WHEN** Alex's Token is on Cell 26 and Alex rolls 4
- **THEN** Alex's Token is on Cell 30, Alex is the Winner, and the Match is Finished

#### Scenario: Passing the Final Cell
- **WHEN** Sam's Token is on Cell 28 and Sam rolls 5
- **THEN** Sam's Token is on Cell 30, Sam is the Winner, and the Match is Finished

#### Scenario: No Rolls after a win
- **WHEN** the loser asks to Roll in a Finished Match
- **THEN** nothing changes

### Requirement: The Match state survives disconnects and restarts
Token positions, the Current Player, the Winner and the last Turn SHALL be kept by the server, so a Player who reconnects, and a server that restarts or is redeployed, continue the same game. The Current Player MAY Roll while the other Player is disconnected.

#### Scenario: Rolling alone
- **WHEN** Sam is disconnected and Alex rolls
- **THEN** the Turn is played, and when Sam comes back Sam sees both Tokens on their current Cells and that it is Sam's Turn

#### Scenario: Redeploy mid-game
- **WHEN** a new version is deployed while Alex's Token is on Cell 12 and it is Sam's Turn
- **THEN** after reconnecting, Alex's Token is still on Cell 12 and it is still Sam's Turn
