# Staging Deployment (INF-05 / INF-06)

How to stand up and maintain the staging environment: `render.yaml` at the
repo root declares every staging resource as code. Production is untouched —
it was created by hand in the Render dashboard (see
`docs/environment-strategy.md`) and none of its resources share a name with
anything below, so a staging blueprint sync can never overwrite or delete a
production service or database.

## One-time setup

1. **Render dashboard → New → Blueprint.** Point it at this repo, `main`
   branch. Render reads `render.yaml` and shows a diff of what it will
   create — 4 Postgres databases and 8 web services, all `-staging`-suffixed
   (see the file for exact names).
2. **Apply it.** Render provisions the databases first, then builds/deploys
   each service from the repo's single shared `Dockerfile` (same image for
   every app — `APP_NAME` picks which one runs, exactly like local Docker
   Compose; see `docs/docker-compose-topology.md` for the equivalent local
   graph).
3. **Fill in the secrets Render can't generate.** Each service that needs one
   declares it with `sync: false` in `render.yaml` — that marks a key Render
   requires to exist but will never fill in from a file committed to git (and
   won't overwrite on later blueprint syncs once you've set it). In the
   dashboard, under each service's own "Environment" tab, set:

   | Service | Key | Staging value | Why not copy production's |
   |---|---|---|---|
   | every service | `JWT_SECRET` | a new, randomly generated secret (same value across all 8, since one service issues tokens the others verify) | tokens signed in staging must never be valid against production, and vice versa |
   | `mihaoo-gateway-staging` | `CORS_ORIGINS` | the staging frontend's origin, e.g. `https://staging--mihaoo.netlify.app` (comma-separate more than one) | the gateway reads this at boot (`apps/gateway/src/main.ts`) — without it, only the two built-in defaults (local dev + production Netlify) are allowed, and the staging frontend gets a browser CORS error identical to the one INF-04 fixed for production |
   | `mihaoo-currency-service-staging` | `GOOGLE_TRANSLATE_API_KEY` | a separate (or quota-limited) API key, if `currency-service` is exercised in staging | isolates staging's request volume/cost from production's key |
   | `mihaoo-banner-export-service-staging` | `FIGMA_TOKEN` | leave blank and keep `FIGMA_MOCK_MODE=true` (already the blueprint's default) unless staging genuinely needs real Figma exports | avoids burning real Figma API quota from test runs |

   (An earlier draft of `render.yaml` tried to put all of these in one shared
   `envVarGroups` block — Render silently ignores `sync: false` on anything
   defined inside an env var group, which would have quietly synced a
   placeholder secret instead of forcing manual entry. Each secret is now
   declared directly on the one service that reads it instead.)

   `JWT_EXPIRES_IN` (on `mihaoo-auth-service-staging`) and `FIGMA_MOCK_MODE`
   (on `mihaoo-banner-export-service-staging`) already have non-secret
   defaults in the blueprint (`15m` / `true`) — only override them in the
   dashboard if staging needs to differ from that.

4. **Confirm the cross-service URLs match.** The blueprint hardcodes each
   service's internal URL as `https://mihaoo-<service>-staging.onrender.com`
   (e.g. `AUTH_SERVICE_URL` on the gateway), matching Render's default public
   hostname for a service of that name. If you rename a service in the
   dashboard after creation, update the corresponding env var(s) in
   `render.yaml` (or the dashboard override) to match.

## Databases and migrations (INF-06)

Each of the 4 stateful services (`auth`, `tournament`, `checklist`,
`analytics`) gets its own staging Postgres instance — `mihaoo-<service>-db-staging`
— wired to that service's `<SERVICE>_DATABASE_URL` via the blueprint's
`fromDatabase` reference. Nothing else in the account can see that connection
string; Prisma's `datasource db { url = env("<SERVICE>_DATABASE_URL") }` in
each `apps/<service>/prisma/schema.prisma` is what actually points the
Prisma Client at it — no code change needed, staging just changes the env
var value, matching how the same code already behaves in `docker-compose.yml`
(local) vs. production today.

**Run migrations** — non-interactive, safe to re-run, this is what
`prisma migrate deploy` is for (as opposed to `migrate dev`, which prompts
and is meant for local iteration only):

```bash
# From your machine, or a Render one-off Job, with each staging
# <SERVICE>_DATABASE_URL exported (copy the value from the dashboard):
npm run prisma:deploy:auth
npm run prisma:deploy:tournament
npm run prisma:deploy:checklist
npm run prisma:deploy:analytics
```

These are the exact same scripts CI could use for any environment — they
apply already-committed migrations, they do not generate new ones, and
`migrate deploy` never drops data, so this cannot wipe existing staging rows.

**Isolation from production:** distinct Render Postgres instances, distinct
hostnames/credentials, distinct `<SERVICE>_DATABASE_URL` values per
environment. There is no shared connection string, no shared instance with a
different schema, and no code path that reads a production URL from
staging or vice versa.

## Seed strategy (INF-06)

A minimal, idempotent seed exists for the two services where an empty
database is otherwise unusable from the UI (you need at least one login, and
at least one `TeamMember` to assign as requester/executor):

```bash
# with AUTH_DATABASE_URL / ANALYTICS_DATABASE_URL pointed at staging:
npm run prisma:seed:auth        # upserts 'user'+'admin' roles and one admin user
npm run prisma:seed:analytics   # upserts one TeamMember, creates one Sprint if none exist
```

- `apps/auth-service/prisma/seed.ts` — creates (or finds, if re-run)
  `admin@staging.mihaoo.local` with both the `user` and `admin` roles.
  Override the email/password via `SEED_ADMIN_EMAIL` /
  `SEED_ADMIN_PASSWORD` env vars before running it; otherwise change the
  default password immediately after the first login.
- `apps/analytics-service/prisma/seed.ts` — creates one `TeamMember` (so the
  requester/executor pickers aren't empty) and one 14-day `Sprint` starting
  "today" (so the Analytics table has a period to report against).

Both scripts only ever `upsert`/find-then-create by a unique key — re-running
them is a no-op past the first run, not a reset. Neither is wired into
`prisma:deploy:*` or any automatic deploy hook; seeding is a deliberate,
manual step you run once against a specific `DATABASE_URL`.

**Never run these against production** — there's no environment guard baked
into the scripts (that would need to guess a naming convention this repo
hasn't committed to); the only thing standing between you and seeding
production is which `DATABASE_URL` is in your shell when you run the
command. Double-check it first.

## Verifying the deploy (INF-05 acceptance criteria)

```bash
# Every service, including the gateway, exposes /health (libs/common's
# shared HealthModule) — 200 means the process is up; it does not check
# that service's own database (that's what GET /ready is for, on the
# stateful services).
curl https://mihaoo-gateway-staging.onrender.com/health
curl https://mihaoo-gateway-staging.onrender.com/health/system   # gateway's own aggregate view across all 7 downstream services

# From the staging frontend's origin (or curl -H "Origin: <staging frontend
# URL>" to simulate it) — should no longer be a browser CORS error once
# CORS_ORIGINS is set (step 3 above):
curl -i -H "Origin: https://staging--mihaoo.netlify.app" \
  -X OPTIONS https://mihaoo-gateway-staging.onrender.com/auth/register
```

## What's still a manual/human decision

- The actual staging frontend URL/origin (needed for `CORS_ORIGINS`) — set
  by whoever owns the frontend's staging deploy.
- Render plan tier per service/database (`render.yaml` defaults everything
  to `starter`, to avoid Render's free-tier Postgres 30-day expiry silently
  deleting staging data, and free-tier web services spinning down between
  requests) — revisit if cost is a concern for a non-production environment.
- Whether staging deploys from `main` (the blueprint's current setting) or a
  dedicated `staging` branch, if this team wants staging to lag behind `main`
  rather than track it directly.
