# Spec Delta

## Purpose

Lets a person take part in Matches as a recognisable Player without creating an account: a display name others see, and a session token that lets the server recognise the same browser again.

## ADDED Requirements

### Requirement: Players choose a display name
Before creating or joining their first Match, a person SHALL enter a display name. Leading and trailing spaces SHALL be removed, and the result SHALL be 1 to 20 characters long.

#### Scenario: Valid name
- **WHEN** a person enters "  Dorothy Gale  " and continues
- **THEN** their display name is "Dorothy Gale"

#### Scenario: Empty name
- **WHEN** a person enters only spaces
- **THEN** they cannot continue and are told a name is required

#### Scenario: Name too long
- **WHEN** a person types a 21st character
- **THEN** the name field does not accept it

### Requirement: The browser remembers the Player
The browser SHALL keep the display name and a random session token between visits. The name SHALL be shown pre-filled and editable before the next create or join. The session token SHALL NOT be shown to the person or appear in any URL.

#### Scenario: Second visit
- **WHEN** a person who entered "Dorothy" yesterday creates a new Match today in the same browser
- **THEN** the name field already says "Dorothy" and they can change it before continuing

#### Scenario: Shared link carries no identity
- **WHEN** a Player copies the invite link of their Match
- **THEN** the link contains only the Match Code, never their session token

### Requirement: Duplicate names are allowed
The system SHALL accept the same display name for both Players in a Match, and SHALL tell them apart by their Token colour.

#### Scenario: Two Dorothys
- **WHEN** both Players in a Match are named "Dorothy"
- **THEN** both names are shown, each next to its own Token colour
