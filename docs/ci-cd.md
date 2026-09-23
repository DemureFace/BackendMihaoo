# CI/CD

## What runs, and when

`.github/workflows/ci.yml` runs on every pull request targeting `main`. There
is no CD (deployment) stage yet — this pipeline only verifies a change,
it doesn't ship it anywhere.

Steps, in order, all in a single job (`ci`) so a failure anywhere stops the
rest and shows up as one failing check on the PR:

1. **Install** — `npm ci` (reproducible install from `package-lock.json`).
   `postinstall` runs `prisma generate` for all four Prisma-backed services
   as a side effect.
2. **Lint** — `npm run lint:check` (same ESLint config as `npm run lint`,
   without `--fix` — CI should fail on problems, not silently rewrite them).
3. **Prisma validation** — `npm run prisma:validate`, running
   `prisma validate` against each of the four `schema.prisma` files
   (auth, tournament, checklist, analytics). This only checks schema syntax;
   it does not connect to a database.
4. **Unit tests** — `npm test -- --passWithNoTests`.
5. **Build** — `npm run build:all`, building all 8 Nest apps
   (gateway + 7 services).

Node is pinned via `actions/setup-node`'s `node-version-file: .nvmrc`
(currently `24.17`), matching `engines.node` in `package.json`.

## Why some things look the way they do

- **Dummy `DATABASE_URL` env vars in the workflow.** Prisma requires the env
  vars referenced in each `schema.prisma` (`AUTH_DATABASE_URL`,
  `TOURNAMENT_DATABASE_URL`, `CHECKLIST_DATABASE_URL`,
  `ANALYTICS_DATABASE_URL`) to simply be *set* for `generate`/`validate` to
  run, even though neither command connects to a real database. The values
  in the workflow's `env:` block are placeholders, not real credentials.
- **`**/src/generated/**` is excluded from ESLint.** Each Prisma-backed
  service generates its client into `src/generated/prisma` (gitignored, but
  present on disk after `prisma generate`, which runs in `postinstall`
  before lint ever runs). Without this exclusion, lint was checking
  thousands of lines of generated code it has no business checking.
- **`no-unsafe-assignment` / `no-unsafe-return` / `no-unsafe-call` /
  `no-unsafe-member-access` are warnings, not errors**, matching the
  existing `no-explicit-any: 'off'` / `no-unsafe-argument: 'warn'`
  convention already in `eslint.config.mjs`. They still show up on PRs;
  they just don't block merge.
- **Tests run with `--passWithNoTests`.** Keep this in mind if you're
  relying on the test step to mean "there are passing tests" — right now it
  only means "nothing failed," which is also true when nothing ran. Add
  real specs (see below) to make it mean something.

## Unit tests

Jest is configured in `package.json` (`testRegex: ".*\\.spec\\.ts$"`,
rooted at `apps/` and `libs/`) — a `*.spec.ts` file next to the code it
tests is picked up automatically, no extra wiring needed.

Two spec files exist as a starting point, both testing pure utility
functions with no NestJS DI or database involved:

- `apps/currency-service/src/currency/amount-locale-map.util.spec.ts`
- `apps/bonus-service/src/bonus-template/date-label.util.spec.ts`

Good next candidates follow the same shape — small, pure, business-logic
functions with no framework or I/O dependencies, e.g.
`apps/banner-export-service/src/banner-export/utils/collect-banner-nodes.util.ts`
or `apps/bonus-service/src/bonus-template/text-substitution.util.ts`.
Service/controller classes that depend on NestJS DI or Prisma need
`@nestjs/testing`'s `Test.createTestingModule` with mocked providers instead
— none of those exist yet.

The `test:e2e:*` scripts (gateway, auth, tournament) are **not** run in CI —
they need a real running database and aren't wired up here.

## What's still missing

- **Branch protection.** The pipeline runs and reports a status, but nothing
  currently stops a PR from merging on a red check. Enable it in the GitHub
  repo: Settings → Branches → add a rule on `main` → require the `ci` status
  check to pass before merging.
- **Frontend build.** No frontend code lives in this repo, so there's no
  frontend step here. If/when a frontend repo exists, it needs its own
  pipeline (or this one needs to grow a second job once the code is
  colocated).
- **CD.** Nothing here deploys anywhere — that's a separate, later piece of
  work.
