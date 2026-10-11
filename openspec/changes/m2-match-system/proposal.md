# Proposal

## Why

The Board is live, but it can't be shared with anyone: there is no way for two Players to be in the same Match. M3's rules need exactly that: two seated Players, each knowing which Token is theirs and whether the other one is there. M2 adds the Match itself: create one, invite a friend by link or Match Code, and see each other live.

## What Changes

- Add a home screen over the Board with **New Match** and **Join with code**.
- Ask for a display name the first time a person creates or joins a Match. The browser remembers it and a random session token that identifies the Player from then on.
- Creating a Match gives a 5-character Match Code and a shareable link (`/m/K7QXM`) with a copy button. The creator takes the Dorothy Seat (orange Token) and the Match is Waiting.
- Opening the link or typing the code joins the Scarecrow Seat (blue Token) and the Match becomes In progress. Both Players see each other's names and whether each is connected, updated live.
- Refreshing, closing and reopening the tab, or losing the connection briefly brings the same Player back to the same Seat. A newer tab of the same Player takes over the Seat from the older one.
- A third person opening a full Match sees "This match is full"; an unknown or mistyped code shows "Match not found".
- A Match is stored by the server, so a Player can come back to it after the server restarts or redeploys.
- **BREAKING (board view):** a Token now appears only for a Seat that is taken, instead of both Tokens always standing at Start.
- The post-deploy smoke test plays the two-Player join in production with two browsers.

Out of scope (M6): the 5-minute Abandoned timer, the 1-hour Waiting expiry, deleting old Matches, Rematch. Out of scope (M3): turns, Rolls, Moves.

## Capabilities

### New Capabilities

- `player-identity`: how a person becomes a recognisable Player without an account: the display name and the session token their browser keeps.
- `match-membership`: creating a Match, joining it by link or Match Code, the two Seats, who is connected, coming back after a disconnect, and the full / not-found cases.

### Modified Capabilities

- `board-view`: the requirement "Both Tokens wait at Start" changes to "Tokens appear for taken Seats", so the Board reflects who has actually joined.

## Impact

- `shared/`: Match types and the WebSocket message types, validated with zod (new dependency).
- `server/`: a `Match` Durable Object (SQLite-backed, WebSocket hibernation), `POST /api/matches`, and a WebSocket endpoint per Match; `wrangler.jsonc` gains the Durable Object binding and migration.
- `client/`: home screen, name prompt, Match screen with invite link and Player list, a WebSocket connection with reconnect, Token visibility per seat.
- `e2e/`: two-browser Match smoke test against production. It creates real (tiny) Matches in production storage on every deploy; they are cleaned up once M6 adds deletion.
- Cost: stays on the Workers free plan (SQLite-backed Durable Objects are included).
