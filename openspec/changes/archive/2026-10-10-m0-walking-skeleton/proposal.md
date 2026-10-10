# Proposal

## Why

Every later milestone (board, Match system, rules, art) must be "done" only when it is live in production, green in CI and passing a post-deploy smoke test. That requires a working path from a commit to a public URL before any game code exists, so M0 builds the thinnest possible end-to-end slice: an almost-empty app that is deployed automatically and checked automatically.

## What Changes

- Create the monorepo skeleton with three workspaces (client, server, shared) plus an end-to-end test workspace, with shared lint, format, typecheck and test commands.
- Serve a placeholder game page (title and build version only, no 3D, no networking) from a single Cloudflare Worker on the free `*.workers.dev` subdomain.
- Expose a health endpoint that reports the deployed build version, so automated checks can prove which commit is live.
- Make any deep link inside the app (e.g. a future `/m/K7QX` Match link) load the game page instead of a 404.
- Add a pull-request pipeline: lint, typecheck and tests must pass before a merge to `main` is allowed.
- Add a deploy pipeline: every merge to `main` deploys to production with no manual steps, then runs a smoke test against the production URL.
- Document how to run the project locally and which one-time account setup (GitHub repo, Cloudflare account and token) a human must do.

Out of scope: the 3D board, Durable Objects, WebSockets, Match logic, custom domain, per-PR preview deployments.

## Capabilities

### New Capabilities

- `app-hosting`: how the game is served on the public internet: the game page, deep-link handling, and the health/version endpoint.
- `delivery-pipeline`: the guarantees around changing production: required checks on pull requests, automatic deploy on merge to `main`, and the post-deploy smoke test.

### Modified Capabilities

(none, no specs exist yet)

## Impact

- New code: root workspace config, `client/` (Vite + React placeholder page), `server/` (Worker entry and Wrangler config), `shared/` (empty package wired into both), `e2e/` (Playwright smoke test), `.github/workflows/`.
- New external systems: a public GitHub repository with branch protection on `main`, a Cloudflare account, and a Cloudflare API token stored as a GitHub Actions secret. These are created by the user, not by code.
- Cost: $0 (Workers free plan, free GitHub Actions minutes for public repos).
