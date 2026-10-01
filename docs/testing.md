# Testing

The definitive reference for how tests are organized, written, and run in
this repo. `docs/ci-cd.md` covers the pipeline that runs them; this doc
covers the tests themselves — what exists, why it's shaped the way it is,
and how to add more.

## The three tiers used here

Ordered cheapest/fastest/most-reliable first — this is also roughly the
order you should reach for them in:

| Tier | What it tests | Speed | Setup |
|---|---|---|---|
| 1. Pure-function unit tests | A plain function, no framework | Milliseconds | None |
| 2. Mocked-DI unit tests | A `@Controller`/`@Injectable` class | Milliseconds | Mock its constructor deps |
| 3. E2E tests | A whole app, over real HTTP, against a real DB | Seconds | Postgres running, migrated |

There is no tier 4 ("hit a real deployed environment") in this repo — see
"What's out of scope" below.

## Running tests locally

```bash
npm test                    # every *.spec.ts under apps/ and libs/ (tiers 1+2)
npm run test:watch          # same, in watch mode
npm run test:cov            # same, with coverage
npm run test:e2e:gateway    # tier 3, gateway — no DB needed
npm run test:e2e:auth       # tier 3, auth-service — needs AUTH_DATABASE_URL pointed at a real, migrated Postgres
npm run test:e2e:tournament # currently fails — see "What's still missing"
```

For `test:e2e:auth` locally, point `AUTH_DATABASE_URL` at any reachable
Postgres and run `npm run prisma:deploy:auth` against it first — see
`docs/production-db-access.md` for one way to get a disposable Postgres via
Docker if you don't already have one running (that doc is about the
production instance, but the same `docker run postgres` pattern works for
a scratch local one too, just without the real credentials).

## Tier 1 — Pure-function unit tests

**What qualifies**: a function that takes plain data in and returns plain
data out — no `@Injectable()`, no constructor, no `HttpService`, no Prisma,
no filesystem/network access. These are the cheapest tests to write, the
fastest to run, and the only ones that literally cannot flake.

**Convention**: `<name>.util.spec.ts` next to `<name>.util.ts`. Jest's
`testRegex` (`package.json`) picks up any `*.spec.ts` under `apps/` or
`libs/` automatically — no registration needed anywhere.

Current coverage:

| Spec | Covers |
|---|---|
| `apps/currency-service/src/currency/amount-locale-map.util.spec.ts` | `parseAmount` (symbol position, thousands vs. decimal separator disambiguation, garbage input); `buildAmountLocaleMap` (AU/NZ/CA 1.5x rate, DE/AT/CH dot-separator+spaced-€, 10x NOK rate, each locale's own "default" formatting, the generic "en" EUR fallback); `buildAmountLocaleMapText`'s block rendering |
| `apps/bonus-service/src/bonus-template/date-label.util.spec.ts` | `parseDateLabel` (fallback year, embedded year, unparseable/unrecognized-month errors); `toIsoDate`/`toDdMm` zero-padding; `addDaysToDateLabel` (same-month and Dec-31-rollover-to-next-year); `defaultDateRangeFromValidity`; `runsConditionLabel` separator handling |
| `apps/bonus-service/src/bonus-template/text-substitution.util.spec.ts` | `boldCode` (whole-word only), `linkGames` (multiple occurrences, absent game), `linkTermsBold` (with/without the optional "General " prefix), `toTitleCase`, `preserveTagAdjacentSpaces` (space-before-tag vs. space-after-tag) |
| `apps/banner-export-service/src/banner-export/utils/collect-banner-nodes.util.spec.ts` | `collectBannerNodes` tree-walking (nested children, only FRAME/COMPONENT/INSTANCE types, dimension rounding, missing/zero bounding box, null root) |
| `apps/gateway/src/http-proxy.util.spec.ts` | `rethrowUpstreamError` (upstream error → same-status `HttpException`; network failure → 502); `withGetRetry` (retries once on network failure, never retries an upstream HTTP error, propagates a second failure) |

**Best practice — pick the next candidate by looking for the shape, not the
folder.** Grep for `*.util.ts` files you haven't touched; if a function has
no decorators and no constructor, it's tier 1 regardless of which service
it lives in. Untested candidates as of this writing:
`apps/tournament-service/src/tournament-template/currency-locale.util.ts`
and most of `apps/tournament-service/src/tournament-template/brands/`.

**Best practice — test the pieces, not always the composition.**
`text-substitution.util.ts` also exports `processPromoText`, which chains
`substituteMoney` → `boldCode` → `linkGames` → `linkTermsBold` and needs a
full `ParsedPromo` fixture (10+ fields) to call. It's deliberately not
tested directly here — each function it calls already has its own coverage,
and a composition test would mostly be fixture-maintenance cost for little
extra confidence. Test the composition too once it grows real branching
logic of its own, not just a fixed pipeline of already-tested steps.

## Tier 2 — Mocked-DI unit tests (controllers/services)

**What qualifies**: a `@Controller` or `@Injectable` class that
constructor-injects something — `HttpService`, `ConfigService`, a Prisma
client, another service. Build it through `@nestjs/testing`'s
`Test.createTestingModule`, supplying a mock for each injected dependency,
then call its methods **directly** (not through `supertest`/HTTP).

Why direct method calls, not HTTP: Nest only evaluates `@UseGuards(...)`
when it's actually routing an HTTP request through its full pipeline —
calling `controller.findAll(...)` in a test skips the guard entirely. This
is intentional here, not an oversight: it keeps the test focused on what
the controller itself does with its dependencies, instead of re-proving
"the JWT guard rejects an unauthenticated request" in every single spec
(that's already covered once, at the e2e tier — see
`apps/gateway/test/app.e2e-spec.ts`).

**Current coverage**: `apps/gateway/src/analytics-proxy/team-members-proxy.controller.spec.ts`
— the only tier-2 spec today, and the template for the rest. It mocks:

```ts
const httpService = { request: jest.fn() };
// ...
providers: [
  { provide: HttpService, useValue: httpService },
  { provide: ConfigService, useValue: { getOrThrow: () => ANALYTICS_SERVICE_URL } },
],
```

`HttpService.request` is mocked to return an RxJS `of({ data })` (success)
or `throwError(() => err)` (failure) — matching its real return type
(`Observable<AxiosResponse>`), since the controller pipes it through
`firstValueFrom`. What it asserts:

- **Header/URL forwarding** — the exact `method`/`url`/`params`/`headers`
  object passed to `httpService.request`, including that `authorization`
  and `x-correlation-id` both make it onto the downstream call.
- **Retry semantics** — a GET retries once after a network failure and
  returns the retried result; a POST is called exactly once even when it
  fails (mutations must never auto-retry — see
  `docs/service-communication.md` §3 and the tier-1 `withGetRetry` spec).
- **Error translation** — an upstream error response becomes an
  `HttpException` carrying the same status.
- **The "missing config is a startup failure" contract** — a
  `ConfigService` whose `getOrThrow` throws makes
  `Test.createTestingModule(...).compile()` itself reject. This is the one
  assertion that goes beyond "does the controller work" into "does the
  documented failure mode in `docs/service-communication.md` §1 actually
  hold" — worth keeping in any proxy controller spec you add.

**Best practice — mock at the injection boundary, not deeper.** Mock
`HttpService`/`ConfigService` (what the constructor receives), not `axios`
itself and not `rethrowUpstreamError`/`withGetRetry` (the controller's own
imported helpers). Mocking any deeper stops the test from exercising the
controller's real logic; mocking any shallower drags in real HTTP/env
dependencies you don't want in a unit test.

**What's next**: every other file under `apps/gateway/src/*-proxy/*.controller.ts`
(`auth-proxy`, `currency-proxy`, `tournament-proxy`,
`tournament-template-proxy`, `bonus-template-proxy`, `checklist-proxy`,
`banner-export-proxy`, plus the other three analytics-proxy controllers —
`tasks-proxy`, `sprints-proxy`, `reference-data-proxy`) has the same
constructor-injection shape and no spec yet. Copy the pattern.

## Tier 3 — E2E tests

**What qualifies**: boots a real Nest application (`Test.createTestingModule({ imports: [WholeAppModule] }).compile()`
→ `app.init()`) and drives it over HTTP with `supertest`. This is the only
tier that touches a real database when the module under test has one.

**Currently wired into CI** (`.github/workflows/ci.yml`): `test:e2e:gateway`
(no DB — the gateway is stateless) and `test:e2e:auth` (needs a real,
migrated Postgres — the workflow runs a `postgres:16-alpine` service
container plus a `prisma:deploy:auth` step before this).

**Currently exists but not wired in**: `test:e2e:tournament` — the Jest
config exists (`apps/tournament-service/test/jest-e2e.json`) but there is
no `.e2e-spec.ts` file to run, only fixture JSON under
`apps/tournament-service/test/fixtures/`. Running it today fails on "no
tests found." Adding a real spec, plus a `TOURNAMENT_DATABASE_URL`-backed
database and its own migration step in the workflow (mirroring `auth`'s),
is the natural next piece of tier-3 work.

**A short, true story about why these three checks (moduleNameMapper,
default-import supertest, ValidationPipe parity) all matter** — all three
were broken here until they were actually run for the first time:

1. `apps/auth-service/test/jest-e2e.json` and
   `apps/tournament-service/test/jest-e2e.json` were missing the
   `moduleNameMapper` entry for the `common/common` path alias that
   `apps/gateway/test/jest-e2e.json` already had. Any spec that imports
   from `libs/common` — even transitively, like `AuthServiceModule`
   importing `HealthModule` — failed at module resolution before a single
   `it(...)` ran. **Lesson**: a Jest config that only some sibling configs
   remembered to copy is a silent gap; if one e2e config needs a mapper,
   the others probably do too, whether or not their current spec happens
   to need it yet.
2. `import * as request from 'supertest'` compiles fine but isn't callable
   at runtime under this repo's `esModuleInterop: true` + `"module":
   "nodenext"` TypeScript config — it throws `TypeError: request is not a
   function`. The fix is a default import: `import request from
   'supertest'`. **Lesson**: this is a TypeScript/CJS-interop footgun, not
   a project-specific one — if you ever see "X is not a function" on a
   namespace-imported CJS package that's supposed to be callable, check the
   import style first.
3. `auth-service`'s e2e `beforeEach` built the app with `Test.createTestingModule(...).compile()`
   → `app.init()` and nothing else — it never called
   `app.useGlobalPipes(new ValidationPipe(...))`, the way `main.ts`'s real
   `bootstrap()` does. Its one test, "`/auth/register` rejects an invalid
   email", passed — but only because nothing was validating the DTO at
   all, so it would have kept "passing" even if `RegisterDto`'s
   `@IsEmail()` were deleted entirely. **Lesson, and the most important one
   here**: an e2e app must be bootstrapped the same way `main.ts` bootstraps
   it (same global pipes/filters/guards), or its assertions can pass for
   reasons that don't hold in production. If `main.ts` ever gains another
   global (an interceptor, another pipe), every e2e spec's `beforeEach`
   needs it too — or, once this happens more than once or twice, factor a
   shared `configureApp(app)` helper both `main.ts` and the e2e specs call,
   so they can't drift apart again.

## What's out of scope (deliberately)

- **No tests against a real deployed environment** (staging/production).
  Tier 3 here means "a real local Postgres in CI," not "hit
  `mihaoo-gateway.onrender.com`." Keep it that way — a CI check that
  depends on a live external environment being up is a check that fails
  for reasons unrelated to the code under review.
- **No tests hitting real third-party APIs.** `currency-service`'s
  `TranslationService` calls Google Translate; `banner-export-service` can
  call the real Figma API. Neither should ever be exercised for real in a
  test — mock `TranslationService`, and rely on `FIGMA_MOCK_MODE=true`
  (already the default outside production) for Figma. A test suite that
  needs a live third-party credential to pass is a test suite that
  randomly fails when that provider hiccups, and costs real API quota on
  every run.
- **No tests of generated Prisma client code** (`src/generated/prisma/**`)
  — it's generated, gitignored, and already excluded from lint for the
  same reason. Test the code that *calls* Prisma (typically via tier-3 e2e,
  since mocking Prisma's fluent query builder realistically is its own
  significant effort that hasn't been taken on here yet).

## What's still missing

- A real `tournament-service` e2e spec (see Tier 3 above).
- Tier-2 specs for the other 10 gateway proxy controllers.
- Any test at all for `bonus-service`, `checklist-service`, and
  `banner-export-service`'s own controllers/services (as opposed to the
  gateway controllers that proxy to them) — today's coverage is either
  tier-1 utils or gateway-side.
- Coverage thresholds / `test:cov` is not enforced anywhere in CI — it runs
  locally on demand only.
