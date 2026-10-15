# Simple online 3D game to learn OpenSpec framework
Result: https://snakes-and-ladders-3d.podoknom.workers.dev/

# Snakes & Ladders: The Yellow Brick Road

An online two-player 3D Snakes & Ladders game played in the browser, themed as the Yellow Brick Road from L. Frank Baum's _The Wonderful Wizard of Oz_ (1900).

- Vocabulary: [`GLOSSARY.md`](GLOSSARY.md)
- Architecture decisions: [`docs/adr/`](docs/adr/)
- Specs and planned changes: [`openspec/`](openspec/)

## Project layout

| Path      | What it is                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------- |
| `client/` | The game page: the 3D Board (Vite + React + React Three Fiber); needs WebGL                           |
| `server/` | The Cloudflare Worker that serves the page and the `/api/*` endpoints, and the `Match` Durable Object |
| `shared/` | Code used by both client and server (`@sl/shared`)                                                    |
| `e2e/`    | Playwright smoke test (production, after every deploy) and visual checks (local)                      |

## How a Match works

Each Match lives in its own [Durable Object](https://developers.cloudflare.com/durable-objects/) (`server/src/match.ts`, see ADR 0001), named by its Match Code. It stores the two Seats (name and a SHA-256 hash of the Player's session token) and holds every WebSocket connected to the Match. Who is connected is worked out from the open sockets, never stored.

| Endpoint                                | What it does                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/matches` `{ token, name }`   | Creates a Match with the caller in the creator Seat; answers `201 { code }`                                                                       |
| `GET /api/matches/:code/ws` (WebSocket) | Joins or returns to a Match and plays it. The client sends `hello { token, name }` and later `roll`; the server answers `welcome`, then `update`s |

During play the Current Player's client sends `roll`; the server throws the die (`server/src/dice.ts`), plays the Turn with the pure rules in `shared/src/rules.ts`, and sends both Players an `update` with event `rolled`. A `roll` from anyone else is ignored. Every snapshot carries the Seats, the Match Phase, both Token positions (0 = Start), the Current Player, the Winner and the last Turn, so a reconnecting Player needs nothing else.

The messages are defined and validated with zod in `shared/src/protocol.ts`. A refused join (`full`, `not_found`) arrives as a `rejected` message, and a tab replaced by a newer one is closed with code 4001.

The browser keeps the name and a random session token in `localStorage`; the token is never shown or put in a URL.

### How a Turn is shown

The server never waits for animations. Each screen animates a `rolled` Turn on its own, using the Turn record in the snapshot:

1. **Die:** it tumbles onto the Board beside the rolling Token and lands with the rolled number on top.
2. **Hops:** the Token hops one Cell at a time.
3. **Jump:** on a Snake or Ladder, the Token flies along its arc.

**Follow camera:** while a Turn plays, the camera glides closer and keeps the Token and die in view, then glides back to the whole Board. Dragging or zooming hands the camera to the Player until the next Turn.

**When the panel updates:** the Turn line, last Turn, Roll button and Winner change only once the Turn has been shown. The client keeps a "shown" snapshot next to the latest one (`client/src/match/playback.ts`) and times the end of each Turn itself (`client/src/board/turnMotion.ts`, at most about 3.6 s), so the panel never depends on frames being drawn.

**No animation (the Tokens just stand on their Cells):**

- when a page opens or reconnects;
- when the device asks for reduced motion;
- for Turns that arrive while the tab is hidden.

## Prerequisites

- Node.js 24 (see `.nvmrc`; `nvm use` picks it up)
- pnpm, via Corepack: `corepack enable pnpm` (the version is pinned in `package.json`)

## Everyday commands

```sh
pnpm install          # install all workspaces
pnpm dev              # game page on http://localhost:5173, Worker on :8787 (/api is proxied)
pnpm test             # unit tests (shared, client) and Worker tests in the Workers runtime
pnpm lint             # ESLint
pnpm format           # Prettier (format:check only checks)
pnpm typecheck        # TypeScript in every workspace
pnpm build            # build the client into client/dist
```

To try a Match from a phone on the same Wi-Fi, run the two halves separately and open the **Network** URL Vite prints (e.g. `http://192.168.1.20:5173`) on both devices:

```sh
pnpm --filter server dev           # in one terminal
pnpm --filter client dev --host    # in another terminal
```

### Smoke test

The smoke test needs a running server with a built client:

```sh
pnpm build
pnpm --filter server dev                      # in one terminal
pnpm --filter e2e exec playwright install chromium   # once
BASE_URL=http://localhost:8787 pnpm smoke     # in another terminal
```

Against production, CI also sets `EXPECTED_VERSION` to the deployed commit SHA.

### Visual checks

Development builds expose `window.__board`. Production builds strip it. It reports:

- where every Cell and arc is on screen;
- the camera's angle, its distance, and the distance of the whole-Board view;
- which Tokens are drawn, where a moving Token reports the last Cell it reached;
- whether a Turn is `animating`;
- the `die` value and whether it is resting;
- whether the camera is `following`.

The visual checks use it to:

- assert that all 30 Cells are visible on a phone and on a desktop;
- play two-Player Matches in separate browser contexts: joining, leaving, returning, a second tab, Match full, Match not found, and a whole game to a Winner (with reduced motion, so it stays fast);
- check a Turn's animation: the panel waits for it, the camera follows and returns, dragging stops it, a reload replays nothing, and reduced motion skips it.

Screenshots go to `e2e/visual-output/`:

```sh
pnpm dev        # in one terminal
pnpm visual     # in another terminal
```

## How changes reach production

1. Open a pull request. The **CI** workflow runs lint, format check, typecheck, tests and build. Branch protection blocks the merge until it passes.
2. Merge to `main`. The **Deploy** workflow runs the same checks, deploys to Cloudflare with the commit SHA as the build version, then runs the smoke test against production.
3. `GET /api/health` on production shows which commit is live.

### Rolling back

- Quickest: `pnpm --filter server exec wrangler rollback` (needs `wrangler login` locally) restores the previous Worker version.
- Then revert the bad commit on `main` through a pull request so the next deploy does not bring it back.
- **Not past a Durable Object migration.** M2 added the `Match` class (migration `v1`). Cloudflare refuses to roll back to a version from before that migration, and refuses code that drops the class without a deletion migration. Fix forward instead: merge a fix and let Deploy ship it. The same applies to every later migration.

## One-time setup (done by a human)

- [ ] Create a **public** GitHub repository, add it as `origin` and push `main`.
- [ ] Create a free [Cloudflare](https://dash.cloudflare.com/sign-up) account.
- [ ] In Cloudflare, create an API token from the **Edit Cloudflare Workers** template.
- [ ] In GitHub → Settings → Secrets and variables → Actions, add secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (the account ID is on the Workers overview page).
- [ ] After the first deploy prints the `*.workers.dev` URL, add it as repository **variable** `PRODUCTION_URL` (no trailing slash) and re-run the Deploy workflow.
- [ ] In GitHub → Settings → Branches, protect `main`: require a pull request, require the `checks` status check, and do not allow bypassing (including administrators).
