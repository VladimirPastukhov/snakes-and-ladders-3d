# Spec Delta

## Purpose

Guarantees how changes reach production: nothing broken can be merged, every merge to `main` goes live without manual steps, and production is checked automatically after every deploy.

## ADDED Requirements

### Requirement: Pull requests must pass checks before merging
Every pull request to `main` SHALL run lint, format check, typecheck and the automated tests. A pull request with any failing check SHALL NOT be mergeable.

#### Scenario: Pull request with a type error
- **WHEN** a pull request introduces a TypeScript type error
- **THEN** the typecheck check fails and the pull request cannot be merged

#### Scenario: Clean pull request
- **WHEN** a pull request passes lint, format check, typecheck and tests
- **THEN** all required checks report success and the pull request can be merged

### Requirement: Direct pushes to main are not allowed
Changes SHALL reach `main` only through a pull request that passed its required checks.

#### Scenario: Attempted direct push
- **WHEN** someone pushes a commit directly to `main`
- **THEN** the push is rejected

### Requirement: Merges to main deploy automatically
Every merge to `main` SHALL deploy that commit to production with no manual steps, and the new version SHALL be live within 10 minutes of the merge.

#### Scenario: Merge goes live
- **WHEN** a pull request is merged to `main`
- **THEN** within 10 minutes `/api/health` on the production URL reports the merged commit's identifier as `version`

#### Scenario: Two merges in quick succession
- **WHEN** a second merge to `main` happens while the first one's deploy is still running
- **THEN** both deploys run one after the other, never at the same time, and production ends on the later commit

### Requirement: Production is smoke-tested after every deploy
After each production deploy, an automated smoke test SHALL run against the production URL in a real browser. It SHALL verify that the game page loads and that the health endpoint reports the commit just deployed. A failing smoke test SHALL mark the deploy run as failed.

#### Scenario: Healthy deploy
- **WHEN** a deploy finishes and the production page and health endpoint behave as specified
- **THEN** the smoke test passes and the deploy run is marked successful

#### Scenario: Stale or broken production
- **WHEN** after a deploy the health endpoint reports a different version, or the game page fails to load
- **THEN** the smoke test fails and the deploy run is marked failed on the `main` commit
