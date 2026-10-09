# Tasks

## 1. Workspace skeleton

- [x] 1.1 Create root `package.json` (pinned `packageManager`), `pnpm-workspace.yaml`, `.nvmrc`, `tsconfig.base.json` (strict) and extend `.gitignore`; verify `pnpm install` succeeds on a clean clone
- [x] 1.2 Add ESLint (flat config, typescript-eslint) and Prettier with root `lint`, `format:check` and `typecheck` scripts; verify all three pass on the skeleton and that a deliberate type error makes `pnpm typecheck` fail
- [x] 1.3 Create `shared/` as `@sl/shared` (source-only TS) exporting a `GAME_TITLE` constant, with a Vitest test; verify `pnpm test` runs it and passes

## 2. Placeholder client

- [x] 2.1 Create `client/` with Vite + React + TypeScript rendering the game title from `@sl/shared` and the build version (Vite `define`, default `"dev"`); verify `pnpm --filter client build` emits `client/dist/index.html` and hashed files under `client/dist/assets/`
- [x] 2.2 Add a Vitest + Testing Library test that the page shows the title and version; verify it passes in `pnpm test`

## 3. Worker serving assets and health endpoint

- [x] 3.1 Create `server/` with `wrangler.jsonc` (assets from `../client/dist` with an `ASSETS` binding, `not_found_handling: "none"`, `run_worker_first: ["/api/*"]`, `VERSION` var defaulting to `"dev"`) and a Worker that answers `GET /api/health` with `{ status: "ok", version }`, JSON 404 for other `/api/*` paths, the game page for non-file deep links and 404 for missing files; verify with `wrangler dev` and curl
- [x] 3.2 Add `@cloudflare/vitest-plugin` tests for: health returns 200 with `version` `"dev"`, unknown `/api/nope` returns 404, `/m/K7QX` returns the game page, `/assets/missing.js` returns 404; verify they pass in `pnpm test`
- [x] 3.3 Wire `pnpm dev` to run Vite and `wrangler dev` together with Vite proxying `/api`; verify the page at the Vite URL loads and `/api/health` answers through the proxy

## 4. Smoke test

- [x] 4.1 Create `e2e/` with Playwright (Chromium only) and a smoke test that, against `BASE_URL`: opens `/` and sees the title, opens `/m/K7QX` and gets the game page, gets 404 for `/assets/missing.js` and `/api/nope`, and polls `/api/health` (up to ~60s) until `version` equals `EXPECTED_VERSION`; verify it passes locally against `wrangler dev` serving a built client with `EXPECTED_VERSION=dev`
- [x] 4.2 Exclude `e2e/` from `pnpm test` and expose it as `pnpm smoke`; verify `pnpm test` does not start a browser

## 5. GitHub and Cloudflare setup (done by the user)

- [x] 5.1 User creates a public GitHub repo, adds it as `origin` and pushes `main`; verify `git remote -v` shows it
- [x] 5.2 User creates a free Cloudflare account and an API token from the "Edit Cloudflare Workers" template, then adds `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions secrets; verify both appear under the repo's Actions secrets

## 6. Pipelines

- [x] 6.1 Add `.github/workflows/ci.yml` (pull requests and pushes to `main`: install, lint, format check, typecheck, test, build); verify a PR shows the check passing
- [x] 6.2 Add `.github/workflows/deploy.yml` (push to `main`, `concurrency` group `deploy-production` without cancelling: checks, build, `wrangler deploy --var VERSION:$GITHUB_SHA`, then `pnpm smoke` with `BASE_URL` from a repo variable and `EXPECTED_VERSION=$GITHUB_SHA`); verify the first run deploys and prints the `*.workers.dev` URL (its smoke step is expected to fail until 6.3 sets the URL)
- [x] 6.3 Store the production URL as repository variable `PRODUCTION_URL` and re-run the deploy; verify the smoke step passes against production
- [x] 6.4 User enables branch protection on `main` (require PR, require the CI check, no direct pushes, including admins); verify a direct `git push` to `main` is rejected

## 7. Documentation

- [x] 7.1 Write `README.md`: what the project is, prerequisites, `pnpm install` / `dev` / `test` / `smoke`, the one-time GitHub + Cloudflare setup checklist from groups 5–6, and rollback (`wrangler rollback` or revert); verify a fresh clone can follow it to a running local app

## 8. End-to-end acceptance

- [x] 8.1 Open a PR with a deliberate type error; verify CI fails and the merge button is blocked, then close the PR
- [ ] 8.2 Merge a PR that changes the placeholder page text; verify within 10 minutes production shows the new text, `/api/health` reports the merge commit, and the deploy run (including smoke test) is green
- [ ] 8.3 Open production on a phone; verify the page loads over HTTPS and `/m/K7QX` shows the game page

## Workflow follow-up

- Archive the change with `/opsx:archive` once all tasks are checked, so `openspec/specs/app-hosting` and `openspec/specs/delivery-pipeline` become the baseline specs.
