# match-play Specification

## Purpose

Defines what each Player sees and does while a Match is played: whose Turn it is, how the Current Player Rolls, what the last Turn did, and who won.

## Requirements

### Requirement: Both screens show whose Turn it is
During an In-progress Match, both Players' screens SHALL show whose Turn it is: "Your Turn" for the Current Player, and "<name>'s Turn" with that Player's Token colour for the other Player.

#### Scenario: Alex starts
- **WHEN** the server picks Alex as the first Current Player
- **THEN** Alex's screen says "Your Turn" and Sam's screen says "Alex's Turn" next to the orange colour

### Requirement: The Current Player Rolls with a button or a key
The Current Player's screen SHALL show a **Roll** button. Pressing it, or pressing Space or Enter while no text field has focus, SHALL request a Roll. The other Player's screen SHALL NOT offer the Roll button. After a request the button SHALL be disabled until the result arrives and its animation has finished.

#### Scenario: Roll by button
- **WHEN** it is Alex's Turn and Alex presses Roll
- **THEN** within 1 second the die starts tumbling on both screens, and within 6 seconds both screens show Alex's result and say it is Sam's Turn

#### Scenario: Roll by keyboard
- **WHEN** it is Alex's Turn on a desktop and Alex presses Space
- **THEN** a Roll is requested, as if Alex pressed the button

#### Scenario: Not your Turn
- **WHEN** it is Alex's Turn
- **THEN** Sam's screen shows no Roll button, and pressing Space on Sam's screen does nothing

### Requirement: Both screens show the last Turn
After every Turn, both screens SHALL show who rolled, the number rolled, and where the Token went, including any Ladder or Snake (for example "Alex rolled 3: Start → 3 → Ladder → 11", "Sam rolled 6: 21 → 27 → Snake → 19"). A Player who reconnects SHALL see the last Turn too.

#### Scenario: Ladder result
- **WHEN** Alex's Token moves from Start to Cell 3 and climbs to Cell 11
- **THEN** both screens show "Alex rolled 3", the Ladder, and Cell 11

#### Scenario: Plain result
- **WHEN** Sam rolls 2 from Cell 5
- **THEN** both screens show "Sam rolled 2: 5 → 7"

### Requirement: The Winner is announced
When a Match is Finished, both screens SHALL announce the Winner: "You win!" for the Winner and "<name> wins" for the other Player. Neither screen SHALL offer the Roll button, and both SHALL offer a way back to the home screen.

#### Scenario: Alex wins
- **WHEN** Alex's Token reaches the Final Cell
- **THEN** Alex sees "You win!", Sam sees "Alex wins", Alex's Token stands on Cell 30, and neither sees a Roll button

#### Scenario: Coming back to a Finished Match
- **WHEN** Sam reopens the link of a Match that Alex has won
- **THEN** Sam sees "Alex wins" and both Tokens where they ended

### Requirement: The panel reveals a Turn when its animation ends
While a Turn is being animated, each screen SHALL keep showing the panel as it was before that Turn: the previous last Turn, the same "Your Turn" / "<name>'s Turn" line, and no Winner. Only when the animation finishes SHALL the screen show the new last Turn, the next Current Player (with the Roll button for them) or the Winner. When no animation plays, the panel SHALL update at once.

#### Scenario: Waiting for the die
- **WHEN** Alex rolls and the die is still tumbling on Sam's screen
- **THEN** Sam's screen still says "Alex's Turn" and shows the last Turn from before this Roll

#### Scenario: Sam's Roll button appears after Alex's Move
- **WHEN** Alex's Token finishes hopping on Sam's screen
- **THEN** Sam's screen shows Alex's result, "Your Turn" and the Roll button

#### Scenario: Winning Move
- **WHEN** Alex's Token is hopping towards the Final Cell for the winning Move
- **THEN** neither screen announces the Winner until the Token stands on Cell 30

#### Scenario: Reduced motion
- **WHEN** Sam's device asks for reduced motion and Alex rolls
- **THEN** Sam's panel shows Alex's result and "Your Turn" as soon as the result arrives

### Requirement: Production play is smoke-tested
After every production deploy, the smoke test SHALL play the first two Turns of a Match with two browser sessions and confirm that each Roll is shown on both screens and that the Turn alternates.

#### Scenario: Deploy check
- **WHEN** the post-deploy smoke test runs against production
- **THEN** the first Current Player rolls, both sessions show the result and the other Player's Turn, that Player rolls, and the Turn comes back
