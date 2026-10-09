# Snakes & Ladders 3D

An online two-player Snakes & Ladders game played in the browser on a 3D board of 30 cells, themed as the Yellow Brick Road from _The Wonderful Wizard of Oz_. The rules are generic Snakes & Ladders; Oz is the theme.

## Language

### Matches and players

**Match**:
One play-through between exactly two Players, from creation until it is Finished or Abandoned.
_Avoid_: Game, room, session, lobby

**Match Code**:
The short code that identifies a Match and is shared (usually as a link) to invite the second Player.
_Avoid_: Room code, invite ID, game ID

**Player**:
An anonymous participant in a Match, known by a display name.
_Avoid_: User, account, client

**Match Phase**:
Where a Match is in its lifecycle: _Waiting_ (one Player present), _In progress_, _Finished_ (a Winner exists) or _Abandoned_.
_Avoid_: Status, state

**Winner**:
The Player whose Token first reaches or passes the Final Cell.

**Rematch**:
A new Match between the same two Players, started after a Finished Match; the old Match is never reset.
_Avoid_: Restart, replay

### Board

**Board**:
The fixed layout of 30 Cells with its Snakes and Ladders, identical in every Match.
_Avoid_: Road, map (when meaning the rules layout)

**Region**:
A stretch of consecutive Cells sharing the same story scenery, such as the poppy field.
_Avoid_: Zone, area, level

**Cell**:
One numbered square on the Board, from 1 to 30.
_Avoid_: Square, tile, field

**Start**:
The off-board position (cell 0) where every Token begins.

**Final Cell**:
Cell 30; reaching or passing it wins the Match.
_Avoid_: Goal, finish, end

**Ladder**:
A connection that sends a Token landing on its bottom Cell up to its top Cell.

**Snake**:
A connection that sends a Token landing on its head Cell down to its tail Cell.

**Event Name**:
The story name of a Snake or Ladder, such as "Deadly Poppies"; it never changes how the Snake or Ladder behaves.
_Avoid_: Hazard, shortcut, trap

**Token**:
A Player's single piece on the Board; Tokens may share a Cell.
_Avoid_: Piece, pawn, counter

### Play

**Turn**:
One Roll by the Current Player plus the Move and any Jump that follow, after which play passes to the other Player.

**Current Player**:
The Player whose Turn it is.

**Roll**:
A single throw of one six-sided die, requested by the Current Player and decided by the server.
_Avoid_: Throw, dice result

**Move**:
Advancing a Token forward by the rolled number of Cells.

**Jump**:
The automatic relocation of a Token by a Snake or Ladder at the end of a Move.
_Avoid_: Slide, climb (when meaning the general concept)
