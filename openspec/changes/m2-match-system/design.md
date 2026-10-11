# Design

## Context

After M1 the Worker (`server/src/index.ts`) serves the client and `/api/health`; there is no Durable Object yet, although ADR 0001 decided on one per Match. The client renders the Board (`BoardScene`) with both Tokens always at Start. `shared/` holds the Board definition. Tests: Vitest in all packages, Workers-runtime tests via `@cloudflare/vitest-plugin`, Playwright smoke test against production and local visual checks against `pnpm dev`. Requirements: `specs/player-identity`, `specs/match-membership`, and the modified Tokens requirement in `specs/board-view`.

## Goals / Non-Goals

**Goals:**
- One authoritative place per Match (its Durable Object) that decides who sits where, and survives restarts and redeploys.
- A message protocol shared by client and server, validated at the server boundary, that M3 extends with Rolls and Moves without restructuring.
- Reconnecting is the normal path, not an edge case: a fresh page load, a refresh and a dropped socket all run the same "hello" handshake.

**Non-Goals:**
- Timers (Waiting expiry, Abandoned after 5 minutes), deleting old Matches, Rematch: M6.
- Turns and Rolls: M3.
- A routing library, a state-management library, or a WebSocket wrapper library.

## Decisions

### Seats are `creator` and `joiner` in code
The rules and protocol call the two Seats `creator` and `joiner`. The client maps them to Dorothy/orange and Scarecrow/blue. This keeps Oz names out of shared code, as with the Board.

### Shared protocol with zod
`shared/src/match.ts` defines the Match snapshot (`code`, `phase: "waiting" | "in_progress"`, `seats: { creator?: SeatView, joiner?: SeatView }` where `SeatView = { name, connected }`) and `shared/src/protocol.ts` defines the messages as zod schemas with types inferred from them:
- client → server: `hello { token, name }`
- server → client: `welcome { you: Seat, match }`, `update { event, match }` where `event` is `joined | connected | disconnected | renamed`, and `rejected { reason: "full" | "not_found" }`. A `replaced` close code tells an older tab it lost the Seat.
The server parses every incoming message with zod and closes the socket on invalid input. Every update carries the full snapshot (a few hundred bytes), so the client never merges partial state.

### HTTP create, WebSocket for everything else
- `POST /api/matches` with `{ token, name }` creates a Match and seats the creator. The Worker generates a code from the 31-character alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no `0 O 1 I L`) with `crypto.getRandomValues`, asks that code's Durable Object to create the Match, and retries with a new code (up to 5 times) if it already holds one. Response: `201 { code }`.
- `GET /api/matches/:code/ws` (WebSocket upgrade) is forwarded to the Match's Durable Object. The code is upper-cased first, so codes match case-insensitively.
- A browser cannot read the HTTP status of a refused WebSocket upgrade, so "not found" and "full" are sent as a `rejected` message on an accepted socket, which is then closed.

*Alternative:* create the Match over the WebSocket too. Rejected: a plain POST is easier to test and gives the client the code before it navigates to `/m/<code>`.

### The Match Durable Object
- SQLite-backed (`new_sqlite_classes` migration in `wrangler.jsonc`), using the key-value storage API with one record: `{ code, phase, seats: { creator?: { tokenHash, name }, joiner?: { tokenHash, name } } }`. Session tokens are stored only as SHA-256 hashes.
- WebSocket hibernation API (`ctx.acceptWebSocket`, `webSocketMessage`, `webSocketClose`). Each socket carries an attachment `{ seat }` once seated, so after the object wakes from hibernation it rebuilds "who is connected" from `ctx.getWebSockets()`. "Connected" is derived from live sockets, never stored.
- On `hello`: same token as a Seat → that Seat (rename if the name changed), close that Seat's older sockets with the `replaced` code; free `joiner` seat → take it and move the phase to `in_progress`; otherwise `rejected: full`. No Match stored → `rejected: not_found`.
- On close or error of a seated socket: broadcast `disconnected` if no other socket holds that Seat.
Hibernation means an idle Match costs nothing while both Players wait, which keeps us on the free plan.

### Client structure
- `client/src/identity.ts`: read/write the display name and session token (`crypto.randomUUID()`) in `localStorage`, with name trimming and validation. If storage is unavailable (some private modes), it falls back to memory for the page's lifetime.
- The browser also remembers the codes of the last 20 Matches it holds a Seat in. Opening one of those links (refresh, reopen) connects straight away; any other Match link first shows the name prompt, pre-filled with the remembered name.
- `client/src/route.ts`: `/` is home, `/m/<code>` is a Match. It uses `history.pushState` and `popstate`, with no router library.
- `client/src/match/connection.ts`: opens the WebSocket, sends `hello` on every (re)connect, reconnects with backoff (0.5 s doubling to 5 s) until the page closes or the server sends `rejected` or `replaced`.
- `client/src/match/state.ts`: a pure reducer from server messages to screen state (`connecting | seated | full | not_found | replaced`), unit-tested without a browser.
- Screens are HTML panels under the Board (home panel, name prompt, Match panel with invite link and Player list, error panels). The Board's canvas takes the space above the panel and the camera frames it there, so a panel never hides a Cell or a Token. `BoardScene` takes the taken Seats and draws only their Tokens.
- The Vite dev proxy forwards `/api` WebSockets too (`ws: true`).

### Presence timing
Closing a tab sends a WebSocket close frame, so the other Player sees "disconnected" almost immediately, well within the spec's 5 seconds. A network that disappears without a close frame (phone loses signal) is only noticed when the connection times out. That is acceptable for M2, and M6's Abandoned rule will build on the same events.

### Testing
- `shared`: zod schema round-trips and rejections.
- `server` (Workers runtime, real Durable Object): create → join → both see each other; third socket rejected `full`; unknown code `not_found`; same token reconnects to the same Seat; a newer socket replaces an older one; closing a socket broadcasts `disconnected`; Match survives the object being reloaded from storage; code alphabet and collision retry.
- `client`: identity rules, routing, the reducer.
- `e2e`: smoke test with two browser contexts in production; the visual checks get a two-Player flow against `pnpm dev`, using the debug hook to confirm which Tokens are drawn.

## Risks / Trade-offs

- [Every deploy's smoke test creates two tiny Matches that are never deleted until M6] → A few hundred bytes each; M6's 7-day deletion clears them.
- [`POST /api/matches` is unauthenticated, so anyone can create Matches] → Free-plan request limits cap the damage; rate limiting can come later if needed.
- [Silent network loss shows "connected" until the connection times out] → Documented above; acceptable at hobby scale.
- [Session token in `localStorage` can be read by script on our own origin] → We load no third-party scripts; the token only grants a Seat in a game.

## Migration Plan

The first deploy with this change applies the Durable Object migration (`v1`, `new_sqlite_classes: ["Match"]`) automatically through `wrangler deploy`. This is the first deploy that cannot simply be reverted. Once the `Match` class exists, Cloudflare refuses code that drops it without an explicit deletion migration, and rolling back to a version from before the migration is not allowed either. The recovery path is to roll forward with a fix. Existing behaviour (`/api/health`, deep links, 404s) is unchanged.
