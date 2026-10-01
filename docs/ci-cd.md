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
5. **Apply auth-service migrations** — `npm run prisma:deploy:auth` against
   the job's `postgres` service container (see below).
6. **E2E tests (gateway)** — `npm run test:e2e:gateway`.
7. **E2E tests (auth)** — `npm run test:e2e:auth`.
8. **Build** — `npm run build:all`, building all 8 Nest apps
   (gateway + 7 services).

The job also declares a `postgres:16-alpine` **service container**
(`POSTGRES_DB: auth_db`, health-checked with `pg_isready` before any step
runs) — needed because `test:e2e:auth` boots the real `AuthServiceModule`,
whose `PrismaService.onModuleInit` calls `$connect()` for real. `auth_db` is
the only database currently needed here (see "Why only one database" below).

Node is pinned via `actions/setup-node`'s `node-version-file: .nvmrc`
(currently `24.17`), matching `engines.node` in `package.json`.

## Why some things look the way they do

- **Dummy `DATABASE_URL` env vars in the workflow.** Prisma requires the env
  vars referenced in each `schema.prisma` (`AUTH_DATABASE_URL`,
  `TOURNAMENT_DATABASE_URL`, `CHECKLIST_DATABASE_URL`,
  `ANALYTICS_DATABASE_URL`) to simply be *set* for `generate`/`validate` to
  run. `AUTH_DATABASE_URL` now does double duty — the same value is also the
  *real* connection string the `postgres` service container answers to for
  the migration/e2e steps; the other three remain unconnected placeholders,
  since no test currently touches those databases.
- **Dummy `JWT_SECRET`/`JWT_EXPIRES_IN` and `*_SERVICE_URL` env vars.**
  `JwtStrategy` (`libs/common/src/auth/jwt.strategy.ts`) and every gateway
  proxy controller read these via `ConfigService.getOrThrow` in their
  *constructors* — per `docs/service-communication.md` §1, "a missing URL is
  a startup-time failure, not a runtime surprise." The gateway e2e suite
  only asserts a 401 on an unauthenticated request, so none of these values
  need to be real or reachable — they just need to exist, so the module can
  finish compiling in `Test.createTestingModule(...).compile()`.
- **Why only one database (`auth_db`), not four.** Only `test:e2e:auth`
  currently exercises a module with a live Prisma connection.
  `test:e2e:gateway` needs no database at all (the gateway is stateless).
  `tournament`'s e2e config exists but has no `.e2e-spec.ts` file yet (see
  "What's still missing"). Add a `TOURNAMENT_DATABASE_URL`-backed database
  and its own migration step only once a real tournament e2e spec exists —
  provisioning it earlier would just be an unused service container.
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
- **Unit tests run with `--passWithNoTests`.** Keep this in mind if you're
  relying on that step to mean "there are passing tests" — on its own it
  only means "nothing failed," which is also true when nothing ran. The e2e
  steps deliberately do **not** get this flag — an e2e suite with no spec
  file should fail the build (missing coverage you thought you had), not
  pass silently. This is also why `tournament`'s e2e config isn't wired into
  CI yet: it has no spec file, so `test:e2e:tournament` would fail outright
  on "no tests found."

## Tests

What's tested, how each kind is written, and the best practices behind them
is documented in full in **`docs/testing.md`** — this file only covers how
the pipeline *runs* them (steps 4/6/7 above) and the env vars that make
that possible (see above). Short version: pure-function unit tests need
nothing extra; the mocked-DI controller test needs nothing extra either;
the e2e tests are the reason this job has a `postgres` service container
and the dummy `JWT_SECRET`/`*_SERVICE_URL` env vars at all.

## What's still missing

- **A `tournament-service` e2e spec, and proxy-controller specs beyond
  `team-members-proxy`.** See `docs/testing.md`'s "What's still missing"
  for the full test-coverage gap list — this file only tracks pipeline-level
  gaps below.
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
