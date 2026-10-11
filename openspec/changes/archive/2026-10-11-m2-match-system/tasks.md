# Tasks

## 1. Shared Match model and protocol

- [x] 1.1 Add `zod` to `shared/` and create `shared/src/match.ts` (seats `creator`/`joiner`, phases, snapshot type, Match Code alphabet and normaliser) and `shared/src/protocol.ts` (zod schemas for `hello`, `welcome`, `update`, `rejected`, plus the `replaced` close code), with tests for valid round-trips, rejected malformed messages, and code normalisation (`k7qxm` → `K7QXM`, look-alike characters refused); verify `pnpm test` passes

## 2. Server: Match Durable Object and API

- [x] 2.1 Add the `Match` Durable Object binding and the `v1` `new_sqlite_classes` migration to `server/wrangler.jsonc` and regenerate `worker-configuration.d.ts`; verify `pnpm typecheck` passes and `wrangler dev` starts
- [x] 2.2 Implement `POST /api/matches` (validate `{ token, name }`, generate a code, create the Match in its Durable Object, retry on collision) with Workers-runtime tests for `201 { code }` with a valid code, `400` on invalid input, and a retry when the first code is taken; verify tests pass
- [x] 2.3 Implement the WebSocket route `/api/matches/:code/ws` and the `hello` handling in the Durable Object (seat by token, take the free `joiner` seat, `rejected: full`, `rejected: not_found`, rename on a changed name, close older sockets of the same seat with `replaced`), with tests using real WebSockets for each case including a lower-case code; verify tests pass
- [x] 2.4 Broadcast `joined`/`connected`/`disconnected` updates with the full snapshot, derive "connected" from live sockets, and rebuild state after the object is reloaded from storage, with tests for presence on close and for a Match surviving a reload; verify tests pass

## 3. Client foundations

- [x] 3.1 Add `client/src/identity.ts` (name trim and 1–20 validation, remembered name, random session token, in-memory fallback when storage fails) with tests; verify tests pass
- [x] 3.2 Add `client/src/route.ts` (`/` home, `/m/<code>` Match, push and back/forward navigation) with tests; verify tests pass
- [x] 3.3 Add `client/src/match/state.ts` (pure reducer from server messages to `connecting | seated | full | not_found | replaced`) and `client/src/match/connection.ts` (send `hello` on every open, reconnect with 0.5 s → 5 s backoff, stop on `rejected`/`replaced`) with tests using a fake WebSocket; verify tests pass
- [x] 3.4 Make the Vite dev proxy forward `/api` WebSockets to Wrangler; verify in `pnpm dev` that a Match page connects

## 4. Screens

- [x] 4.1 Add the home panel (New Match, Match Code field and Join) and the name prompt, with jsdom tests for name validation and the Join field upper-casing; verify tests pass and creating a Match in `pnpm dev` lands on `/m/<code>`
- [x] 4.2 Add the Match panel: invite link with Copy link, the Match Code, and both seats as Dorothy/Scarecrow with name and connected state or "Waiting for a friend…", with jsdom tests rendering it from reducer states; verify tests pass
- [x] 4.3 Add the "This match is full", "Match not found", "This match is open in another tab" and "Reconnecting…" states, each (except reconnecting) with a button back home, with jsdom tests; verify tests pass
- [x] 4.4 Draw Tokens only for taken seats in `BoardScene` and expose the drawn Tokens on `window.__board`; verify the M1 visual checks still pass and the home screen shows no Tokens

## 5. End-to-end checks

- [x] 5.1 Extend `pnpm visual` with a two-Player flow against `pnpm dev`, using separate browser contexts: create, join by link, both see both Players connected and both Tokens; closing one context shows it disconnected within 5 s; refreshing keeps the seat; a second tab of the same Player replaces the first; a third context sees "This match is full"; a bad code shows "Match not found"; verify it passes and save screenshots
- [x] 5.2 Restart `wrangler dev` while two Players are connected (scripted); verify both pages reconnect to the same seats with the same names
- [x] 5.3 Add the two-session Match check to the production smoke test; verify `pnpm smoke` passes locally against `wrangler dev` with a built client

## 6. Docs

- [x] 6.1 Add **Seat** to `GLOSSARY.md` (one of a Match's two places for a Player: the creator's or the joiner's) and use it consistently; verify the glossary has no implementation details
- [x] 6.2 Update `README.md` with the Match API, the Durable Object, and the note that this Worker can no longer be rolled back past the migration; verify `pnpm format:check` passes

## 7. Acceptance

- [x] 7.1 Open the M2 pull request with screenshots from 5.1; verify CI is green
- [x] 7.2 Owner creates a Match on the computer and joins it from their phone via the invite link (local network `pnpm dev`); verify both screens show both Players, closing the phone tab shows it disconnected, and reopening the link brings it back to the Scarecrow seat

## Workflow follow-up

- Run `/opsx:archive` on this branch before merging, so one PR carries the code, the new `player-identity` and `match-membership` specs, the modified `board-view` spec and the archived change.
- After merge, confirm the Deploy run is green including the two-session smoke check, and keep a Match open during that deploy to see both Players reconnect.
