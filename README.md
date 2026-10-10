# Snakes & Ladders: The Yellow Brick Road

An online two-player 3D Snakes & Ladders game played in the browser, themed as the Yellow Brick Road from L. Frank Baum's _The Wonderful Wizard of Oz_ (1900).

- Vocabulary: [`GLOSSARY.md`](GLOSSARY.md)
- Architecture decisions: [`docs/adr/`](docs/adr/)
- Specs and planned changes: [`openspec/`](openspec/)

## Project layout

| Path      | What it is                                                                       |
| --------- | -------------------------------------------------------------------------------- |
| `client/` | The game page: the 3D Board (Vite + React + React Three Fiber); needs WebGL      |
| `server/` | The Cloudflare Worker that serves the page and the `/api/*` endpoints            |
| `shared/` | Code used by both client and server (`@sl/shared`)                               |
| `e2e/`    | Playwright smoke test (production, after every deploy) and visual checks (local) |

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

Development builds expose `window.__board`: where every Cell and arc is on screen, the camera angle and distance, and the selected Event Name. Production builds strip it. The visual checks use it to assert that all 30 Cells are visible on a phone and on a desktop, and that hovering an arc shows its Event Name, then save screenshots to `e2e/visual-output/`:

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

## One-time setup (done by a human)

- [ ] Create a **public** GitHub repository, add it as `origin` and push `main`.
- [ ] Create a free [Cloudflare](https://dash.cloudflare.com/sign-up) account.
- [ ] In Cloudflare, create an API token from the **Edit Cloudflare Workers** template.
- [ ] In GitHub → Settings → Secrets and variables → Actions, add secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (the account ID is on the Workers overview page).
- [ ] After the first deploy prints the `*.workers.dev` URL, add it as repository **variable** `PRODUCTION_URL` (no trailing slash) and re-run the Deploy workflow.
- [ ] In GitHub → Settings → Branches, protect `main`: require a pull request, require the `checks` status check, and do not allow bypassing (including administrators).
