# Spec Delta

## Purpose

Defines how a played Turn is shown on the Board: the die tumbling to the rolled number, the Token hopping Cell by Cell, flying along a Snake or Ladder, the camera following it, and when this animation is skipped.

## ADDED Requirements

### Requirement: A die tumbles to the rolled number
After every Roll, both Players' screens SHALL show a 3D die thrown onto the Board beside the rolling Player's Token. It SHALL tumble for about one second and come to rest with the rolled number facing up and readable from the camera. The die SHALL start tumbling within 1 second of the Roll being requested.

#### Scenario: Alex rolls a 4
- **WHEN** Alex presses Roll and the server decides 4
- **THEN** within 1 second a die starts tumbling beside Alex's Token on both screens, and it stops showing 4 on its top face

#### Scenario: Die between Turns
- **WHEN** a Turn's animation has finished
- **THEN** the die stays at rest showing that Roll until the next Roll is thrown

### Requirement: Tokens hop Cell by Cell
After the die stops, the rolling Player's Token SHALL hop along the road one Cell at a time, one hop per Cell moved. A Move that would pass the Final Cell SHALL stop at the Final Cell, with no hops beyond it.

#### Scenario: Four hops
- **WHEN** Alex's Token is on Cell 5 and Alex rolls 4
- **THEN** the Token hops onto Cells 6, 7, 8 and 9 in turn and stops on Cell 9

#### Scenario: Leaving Start
- **WHEN** Sam's Token is at Start and Sam rolls 2
- **THEN** the Token hops from Start onto Cell 1 and then Cell 2

#### Scenario: Stopping at the Final Cell
- **WHEN** Alex's Token is on Cell 28 and Alex rolls 5
- **THEN** the Token hops onto Cells 29 and 30 and stops there

### Requirement: Tokens fly along a Snake or Ladder
When a Move ends on the start Cell of a Snake or Ladder, the Token SHALL, after its last hop, fly along that Snake's or Ladder's arc to its destination Cell. The flight SHALL look the same for Snakes and Ladders apart from its direction.

#### Scenario: Climbing a Ladder
- **WHEN** Alex rolls 3 from Start
- **THEN** the Token hops to Cell 3, then flies along the arc from Cell 3 up to Cell 11 and lands there

#### Scenario: Sliding down a Snake
- **WHEN** Sam's Move ends on Cell 27
- **THEN** after the last hop the Token flies along the arc from Cell 27 to Cell 19 and lands there

### Requirement: A Turn's animation finishes within a time limit
A Turn's whole animation, from the die starting to tumble to the Token resting on its final Cell, SHALL take at most 5 seconds, so both screens have settled within 6 seconds of the Roll.

#### Scenario: Longest Turn
- **WHEN** a Player rolls 6 and the Move ends on a Snake
- **THEN** the die, six hops and the flight are all finished within 5 seconds of the die starting to tumble

### Requirement: The camera follows the moving Token
While a Turn animates, the camera SHALL glide closer and keep the moving Token and die in view. When the animation ends, it SHALL glide back to the view that frames the whole Board. If the Player drags or zooms during the animation, the camera SHALL stop following for the rest of that Turn and leave the view where the Player put it.

#### Scenario: Following a Ladder
- **WHEN** Alex's Token hops to Cell 3 and climbs to Cell 11
- **THEN** the camera stays close to the Token through the hops and the flight, then returns to showing all 30 Cells

#### Scenario: Player takes the camera
- **WHEN** Sam drags to rotate the Board while Alex's Token is hopping
- **THEN** Sam's camera stops following and stays where Sam left it, and Alex's camera keeps following

### Requirement: Turns are animated one at a time, in order
Each screen SHALL animate every Turn it receives in the order the Turns were played, starting the next one only after the previous one has finished.

#### Scenario: A quick reply
- **WHEN** Sam rolls while Alex's screen is still finishing Alex's previous Turn
- **THEN** Alex's screen finishes Alex's Turn first, then animates Sam's Turn

### Requirement: Animation is skipped when it would not help
A screen SHALL NOT animate a Turn when it opens or reconnects to a Match, and SHALL instead show Tokens on their current Cells and the die showing the last Roll. When the device asks for reduced motion, the die SHALL show its number without tumbling, Tokens SHALL move straight to their final Cell and the camera SHALL stay still. Turns received while the page was hidden SHALL be applied without animation when it becomes visible.

#### Scenario: Reopening a Match
- **WHEN** Sam reloads the page during an In-progress Match
- **THEN** both Tokens appear straight on their current Cells, with no hops or flights replayed

#### Scenario: Reduced motion
- **WHEN** Alex's device asks for reduced motion and Sam rolls 3 from Start
- **THEN** Alex's screen shows the die at 3 and Sam's Token on Cell 11 with no tumbling, hops, flight or camera movement

#### Scenario: Background tab
- **WHEN** Alex's tab is hidden while Sam plays a Turn, and Alex comes back to it
- **THEN** Sam's Token is already on its new Cell, without the Turn being animated
