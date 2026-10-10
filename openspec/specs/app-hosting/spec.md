# app-hosting Specification

## Purpose

Defines how the game is reachable on the public internet: the page players open, how links into the app resolve, and how anyone can tell which build is live.

## Requirements

### Requirement: Game page is served at the production URL
The system SHALL serve the game page over HTTPS at the production URL root. The page SHALL show the game title and the build version it was built from.

#### Scenario: Visitor opens the production URL
- **WHEN** a visitor opens the production URL root in a modern desktop or mobile browser
- **THEN** the page loads with HTTP 200 and shows the game title and a build version

#### Scenario: Plain HTTP is upgraded
- **WHEN** a visitor types the production URL with `http://` into a browser
- **THEN** the page is loaded over HTTPS

### Requirement: Deep links load the game page
Any path that is not a static file or an API endpoint SHALL return the game page, so links such as a future Match link can be shared and opened directly.

#### Scenario: Visitor opens a Match-style link
- **WHEN** a visitor opens `/m/K7QX` on the production URL
- **THEN** the response is HTTP 200 with the game page, not a 404

#### Scenario: Missing static file
- **WHEN** a request is made for a static asset path that does not exist, such as `/assets/missing.js`
- **THEN** the response is HTTP 404 and is not the game page

### Requirement: Health endpoint reports the live build
The system SHALL expose `GET /api/health`, returning HTTP 200 with a JSON body containing `status: "ok"` and `version`, the identifier of the source commit that was deployed.

#### Scenario: Health check after a deploy
- **WHEN** a client requests `/api/health` after commit `abc1234` was deployed
- **THEN** the response is HTTP 200 JSON with `status` equal to `"ok"` and `version` equal to that commit's identifier

#### Scenario: Unknown API path
- **WHEN** a client requests an API path that does not exist, such as `/api/nope`
- **THEN** the response is HTTP 404 and is not the game page

#### Scenario: Local development build
- **WHEN** the app runs locally rather than from a deploy
- **THEN** `/api/health` still returns `status` `"ok"` with `version` equal to `"dev"`
