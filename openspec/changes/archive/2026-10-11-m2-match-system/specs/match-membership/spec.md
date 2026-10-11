# Spec Delta

## Purpose

Defines how two Players come together in a Match: creating it, inviting and joining by link or Match Code, which Seat each Player holds, seeing each other's presence live, and coming back after a disconnect.

## ADDED Requirements

### Requirement: The home screen offers New Match and Join
Opening the game at its root SHALL show the Board with two actions: **New Match** and **Join with code**.

#### Scenario: First visit
- **WHEN** a visitor opens the production URL root
- **THEN** they see the Board with a New Match button and a Match Code field with a Join button

### Requirement: Creating a Match
New Match SHALL create a Match in the Waiting phase with a new Match Code and seat its creator as Dorothy (orange Token). The creator SHALL then see the Match screen with the invite link `/m/<Match Code>`, a button that copies it, and the Match Code on its own.

#### Scenario: Create
- **WHEN** Alex, named "Alex", presses New Match
- **THEN** the address bar shows `/m/<code>`, Alex is listed as Dorothy and connected, the Scarecrow Seat shows "Waiting for a friend…", and Copy link puts the full link on the clipboard

### Requirement: Match Codes are short and unambiguous
A Match Code SHALL be 5 characters from an alphabet without look-alike characters (no `0`, `O`, `1`, `I` or `L`). Codes SHALL be matched case-insensitively and SHALL never identify two Matches at once.

#### Scenario: Lower-case entry
- **WHEN** a person types `k7qxm` into the Join field for Match `K7QXM`
- **THEN** they join Match `K7QXM`

### Requirement: Joining a Waiting Match
Opening a Waiting Match's link, or entering its Match Code, SHALL seat the visitor as Scarecrow (blue Token) and move the Match to In progress. Both Players SHALL see both names and both connection states.

#### Scenario: Friend joins by link
- **WHEN** Sam opens Alex's invite link and enters the name "Sam"
- **THEN** Sam is seated as Scarecrow, and within 2 seconds both Alex's and Sam's screens list Alex as Dorothy and Sam as Scarecrow, both connected

### Requirement: Presence is shown live
Each Player's screen SHALL show whether the other Player is connected, and SHALL update within 5 seconds when that changes.

#### Scenario: Friend closes the tab
- **WHEN** Sam closes their tab during a Match
- **THEN** within 5 seconds Alex's screen shows Sam as disconnected, and Sam stays in the Scarecrow Seat

### Requirement: Players return to their own Seat
A Player who reloads, reopens the link, or loses the connection SHALL return to the same Seat with the same name, from the same browser. The client SHALL reconnect automatically after a dropped connection.

#### Scenario: Refresh
- **WHEN** Alex refreshes the Match page
- **THEN** Alex is back in the Dorothy Seat without being asked for a name, and Sam sees Alex reconnect

#### Scenario: Server redeployed
- **WHEN** a new version is deployed while Alex and Sam are in a Match
- **THEN** both reconnect to the same Match, in the same Seats

### Requirement: The newest tab holds the Seat
If a Player opens the same Match in a second tab or window, the newest one SHALL hold the Seat, and the older one SHALL show "This match is open in another tab" and stop updating.

#### Scenario: Second tab
- **WHEN** Alex opens their Match link in a second tab
- **THEN** the second tab shows the Match as Dorothy, and the first tab shows "This match is open in another tab"

### Requirement: Full and unknown Matches are refused
A person who is not one of a Match's two Players SHALL see "This match is full" when both Seats are taken. A Match Code that does not identify a Match SHALL show "Match not found". Both screens SHALL offer a way back to the home screen.

#### Scenario: Third person
- **WHEN** a third person opens the link of a Match where Alex and Sam are seated
- **THEN** they see "This match is full" and a button back to the home screen

#### Scenario: Mistyped code
- **WHEN** a person enters a Match Code that no Match has
- **THEN** they see "Match not found" and a button back to the home screen

### Requirement: Production Matches are smoke-tested
After every production deploy, the smoke test SHALL use two separate browser sessions to create a Match, join it by link, and confirm that each session sees both Players connected.

#### Scenario: Deploy check
- **WHEN** the post-deploy smoke test runs against production
- **THEN** a Match created in one browser session is joined from another, and both list both Players as connected
