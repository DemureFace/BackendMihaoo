## Description

A NestJS monorepo split into microservices behind an HTTP API gateway:

- **`apps/gateway`** — the only public entrypoint (port 3000). Verifies JWTs itself
  and proxies requests to the other services over HTTP, forwarding the
  `Authorization` header so each service can independently re-verify the token.
- **`apps/auth-service`** (port 3001) — owns the `User`/`Role` tables in its own
  Postgres database. Issues JWTs on `/auth/register` and `/auth/login`.
- **`libs/common`** — shared, generic auth infrastructure (`JwtStrategy`,
  `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`) used by every service that
  needs to verify the same JWT. Domain DTOs are **not** shared — each service
  owns its own.

Each service has its own Prisma schema/migrations/database — no service reads
another's tables directly.

## Running everything with Docker

```bash
cp .env.example .env      # only needed to also run things outside Docker
docker compose up -d --build
```

This starts 2 Postgres containers (one per service) and all 3 Nest apps.
Tables don't exist yet on a fresh database — run migrations once per service
(from the host, against the ports Docker exposes):

```bash
npm install                      # if you haven't already
npm run prisma:migrate:auth      # creates apps/auth-service tables
```

Then try it:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@example.com","password":"password123"}'

# copy the accessToken from the response, then:
curl http://localhost:3000/auth/profile -H "Authorization: Bearer <token>"
```

`docker compose logs -f <service>` to tail a service, `docker compose down` to
stop everything (add `-v` to also wipe the Postgres volumes).

## Example requests

All requests go through the gateway at `http://localhost:3000`. GET/DELETE
requests have no body — only the `Authorization` header once you have a token.

**`POST /auth/register`**

```json
{
  "email": "alex@example.com",
  "password": "password123"
}
```

**`POST /auth/login`**

```json
{
  "email": "alex@example.com",
  "password": "password123"
}
```

**`GET /auth/profile`** — header only: `Authorization: Bearer <accessToken>`

`email` must be a valid email and `password` needs at least 8 characters on
register — violating these returns a 400 from `class-validator`.

## Local development

The database still runs in Docker — just the two Postgres containers, not the
app containers. The Nest apps run locally with `--watch` for instant reload.

```bash
npm install
cp .env.example .env                     # sets AUTH_DATABASE_URL to localhost:5433
docker compose up -d auth-postgres        # only the DB, skip gateway/auth-service
npm run prisma:migrate:auth

npm run prisma:migrate:tournament   # creates the DB migration + table
npm run start:tournament:dev        # runs the service standalone

npm run start:gateway:dev
npm run start:auth:dev
```

Your local Nest processes connect out to `localhost:5433`, which Docker
forwards into the `auth-postgres` container — so you get disposable,
versioned databases without installing Postgres natively, while the app code
still runs with instant hot-reload.

## Seeding checklists

`scripts/seed-checklists.sql` loads a batch of `Checklist` templates directly
into the database via `INSERT` statements — useful for bulk-loading checklists
that already exist elsewhere, bypassing the `POST /checklists` API. It only
inserts `Checklist` rows (templates); it does not create `ChecklistCompletion`
records, since those represent someone actually having answered a checklist.

**Local (Docker):**

```bash
docker exec -i mihaoo-backend-checklist-postgres-1 psql -U postgres -d checklist_db < scripts/seed-checklists.sql
```

On Windows PowerShell, `<` redirection isn't supported. Use `cmd /c` to get
plain byte-for-byte file redirection instead of PowerShell's own pipeline:

```powershell
cmd /c "docker exec -i mihaoo-backend-checklist-postgres-1 psql -U postgres -d checklist_db < scripts\seed-checklists.sql"
```

**Production (Render):** get the `checklist_db` database's *external* connection
string from Render's dashboard (the internal one only works from other Render
services, not your machine). If you have `psql` installed locally:

```bash
psql "<RENDER_EXTERNAL_CONNECTION_STRING>" -f scripts/seed-checklists.sql
```

Otherwise, reuse the local `checklist-postgres` Docker container purely as a
`psql` client — it just connects out to the remote host, it doesn't touch its
own local data:

```bash
docker exec -i mihaoo-backend-checklist-postgres-1 psql "<RENDER_EXTERNAL_CONNECTION_STRING>" < scripts/seed-checklists.sql
```

```powershell
cmd /c "docker exec -i mihaoo-backend-checklist-postgres-1 psql ""<RENDER_EXTERNAL_CONNECTION_STRING>"" < scripts\seed-checklists.sql"
```

**Troubleshooting: Cyrillic/non-ASCII text shows up as `?????`**

This happens if the file is piped in with PowerShell's `Get-Content | ...`
instead of real file redirection — `Get-Content` returns .NET string objects,
and PowerShell re-encodes them using the console's legacy codepage (not UTF-8)
before handing them to a native process's stdin, corrupting any non-ASCII
character. The `.sql` file itself is fine (it's UTF-8) — always use `cmd /c`
with `<` redirection as shown above, never `Get-Content | docker exec ...`,
when the file contains non-ASCII text.

If bad data already got inserted this way, clear it out and re-seed:

```powershell
cmd /c "docker exec -i mihaoo-backend-checklist-postgres-1 psql -U postgres -d checklist_db < scripts\reset-checklists.sql"
cmd /c "docker exec -i mihaoo-backend-checklist-postgres-1 psql -U postgres -d checklist_db < scripts\seed-checklists.sql"
```

`scripts/reset-checklists.sql` runs `TRUNCATE "Checklist" RESTART IDENTITY CASCADE;`
— it clears every checklist (and any completions referencing them, via `CASCADE`)
and resets the auto-increment counter back to 1, so a fresh seed run gets clean
sequential ids again instead of continuing from wherever the old rows left off.

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests (each app needs its database migrated and reachable first)
$ npm run test:e2e:gateway
$ npm run test:e2e:auth

# test coverage
$ npm run test:cov
```

## Health checks

Every service exposes `/health` and `/ready`, backed by a shared health module:

- **`libs/common/src/health/`** — a shared `HealthModule` (dynamic module),
  `HealthService`, and version reader. Each service registers it with
  `HealthModule.forRoot({ serviceName, databaseCheck? })`.
- **`/health`** — liveness: `{ status, service, version, timestamp }`.
- **`/ready`** — readiness: same fields plus `checks: { database: 'ok'|'error' }`
  for services with a DB (auth, tournament, checklist, analytics —
  each pings its own Prisma client with `SELECT 1`). Returns HTTP 503 if any
  check fails. Services without a DB (bonus, currency, banner-export, gateway)
  just report `checks: {}`.

`version` is read from the repo-root `package.json` at `process.cwd()` — that's
why the `Dockerfile` copies `package.json` into the runtime image alongside
`dist/`.

**`GET /health/system`** (gateway only) — a dashboard-style aggregate:
`apps/gateway/src/system-health/` fans out a `/health` call to every downstream
service's `*_SERVICE_URL` in parallel (3s timeout each) and returns
`{ status, timestamp, services: { "auth-service": "ok", ... } }`, 503 if any
service is down. It's for humans/dashboards, not for orchestrator health
checks — each service's own `/ready` stays the thing Docker/k8s acts on, so
one service being down never drags another's readiness down with it.

## Service communication rules

[`docs/service-communication.md`](docs/service-communication.md) defines the
gateway ↔ service REST contract: internal URL format, request timeout, retry
policy (mutations are never auto-retried), correlation ID propagation, user
context (JWT) handling, downstream-unavailable behavior, and the unified API
error format (`{ error: { code, message, correlationId, timestamp, path } }`,
via the shared `AllExceptionsFilter` every service registers).

## Deployment

- **Local**: `docker compose up -d --build` (see "Running everything with
  Docker" above).
- **Staging**: `render.yaml` (Render Blueprint) provisions every staging
  service/database as code — see
  [`docs/staging-deployment.md`](docs/staging-deployment.md) for setup,
  secrets, migrations, and seeding.
- **Environment overview** (local/staging/production side by side):
  [`docs/environment-strategy.md`](docs/environment-strategy.md).

## Diagrams

Gateway Logic

https://claude.ai/code/artifact/5d1ba15a-9f32-450e-b254-d47e23132390?via=auto_preview

https://claude.ai/code/artifact/ac5503dc-6d72-4e4a-b8bf-74d101304a1f
