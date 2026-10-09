# Design

## Context

The repository holds only OpenSpec scaffolding, `GLOSSARY.md` and ADR 0001 (one Cloudflare Durable Object per Match; the same Worker serves the client). There is no code, no GitHub remote and no Cloudflare account linked yet. M0 deliberately contains no Durable Object; it only proves the path from commit to live URL. The requirements are in `specs/app-hosting` and `specs/delivery-pipeline`.

## Goals / Non-Goals

**Goals:**
- A repo layout that later milestones extend instead of restructure.
- One command each for local dev, checks and tests, run identically on a laptop and in CI.
- A deploy that is traceable: production always says which commit it runs.

**Non-Goals:**
- React Three Fiber, Durable Objects, WebSockets, zod (added by the milestones that need them).
- Per-PR preview deployments (see Decisions).
- Staging environment, custom domain, monitoring beyond Cloudflare's built-in Workers logs.

## Decisions

### Workspace layout
pnpm workspaces with `client/`, `server/`, `shared/`, `e2e/`. Root `package.json` has the scripts `dev`, `lint`, `format:check`, `typecheck`, `test`, `build`, `deploy`. `shared/` is a source-only TypeScript package (no build step) imported by `client` and `server` as `@sl/shared`. It is empty apart from a version constant and its test, but wiring it now proves the import path works in Vite, Wrangler and Vitest before real rules code depends on it.
*Alternative:* Turborepo/Nx. Rejected: four packages don't need a task graph or caching.

### One Worker serves assets and API
`server/wrangler.jsonc` points `assets.directory` at `../client/dist`, sets `not_found_handling: "single-page-application"` so deep links return `index.html`, and `run_worker_first: ["/api/*"]` so API paths always reach the Worker (and unknown ones get a JSON 404 instead of the page). Cloudflare applies the SPA fallback to browser navigation requests (`Sec-Fetch-Mode: navigate`); other requests for missing files fall through to the Worker, which answers 404. The exact fallback rules for requests without that header are verified in the smoke test rather than assumed. This is the setup ADR 0001 assumes, so M2 only adds a Durable Object binding.
*Alternative:* client on Cloudflare Pages, Worker separately. Rejected: two deploys and cross-origin WebSockets later.

### Build version
CI passes the commit SHA to the deploy as a Worker variable (`wrangler deploy --var VERSION:$GITHUB_SHA`). Locally the variable defaults to `"dev"` in `wrangler.jsonc`. The client gets the same value at build time through a Vite `define`, so the page and `/api/health` always agree.

### Local development
`pnpm dev` runs Vite (client, hot reload) and `wrangler dev` (server) together; Vite proxies `/api` to Wrangler. This keeps the Worker in Wrangler's normal runtime and setup simple.
*Alternative:* `@cloudflare/vite-plugin`, which runs the Worker inside Vite's dev server. Worth revisiting in M2 when WebSockets arrive; not needed for one endpoint.

### Tooling
TypeScript in strict mode, ESLint (flat config, typescript-eslint), Prettier, Vitest. Server tests use `@cloudflare/vitest-pool-workers`, so `/api/health` is tested in the real Workers runtime. Node LTS version pinned in `.nvmrc` and `packageManager` in the root `package.json`, so CI and laptops use the same versions.

### CI/CD on GitHub Actions
- `ci.yml` runs on pull requests (and on pushes to `main`): install, lint, format check, typecheck, test, build. Its job is the required status check in branch protection.
- `deploy.yml` runs on pushes to `main`: the same checks, then `wrangler deploy` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets, then the Playwright smoke test against the production URL with `EXPECTED_VERSION=$GITHUB_SHA`. `concurrency: { group: deploy-production, cancel-in-progress: false }` queues overlapping deploys instead of running them in parallel.
- The smoke test retries `/api/health` for up to about 60 seconds before failing, which covers propagation delay after the deploy.

### No per-PR preview deployments
Q20 accepted previews only "if cheap". Cloudflare preview URLs don't work for Workers that define Durable Objects, which this Worker will from M2 onward. Building them now would mean throwing them away in M2, so they are skipped.

## Risks / Trade-offs

- [The smoke test hits production, so a bad deploy is already live when it fails] → Acceptable at hobby scale; rollback is `wrangler rollback` or reverting the commit, documented in the README.
- [Branch protection and secrets are set by hand in GitHub and Cloudflare dashboards, so they can drift] → The README lists them as a checklist, and the spec scenarios ("direct push rejected", "merge goes live") are checked once manually during apply.
- [Free-plan limits (Workers requests, Actions minutes)] → Far above hobby traffic; public repos get unlimited Actions minutes.

## Migration Plan

First deploy only, nothing to migrate. Order: the user creates the GitHub repo and Cloudflare account and token → push the skeleton → the first `main` deploy creates the Worker and its `*.workers.dev` URL → put that URL into the smoke test config → enable branch protection with the CI check as required. Rollback: `wrangler rollback` to the previous version, or revert on `main`.

## Open Questions

- The exact `*.workers.dev` URL is only known after the first deploy (it depends on the Cloudflare account subdomain). It goes into the smoke test config as a variable; nothing else depends on it.
