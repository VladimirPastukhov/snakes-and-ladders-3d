# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
