# Connecting to `mihaoo-db` (Production Postgres)

Production uses a single Render Postgres **instance** named `mihaoo-db`
(Frankfurt region) that hosts one **database per service** (`auth_db`,
`tournament_db`, `checklist_db`, `analytics_db`, ...) — unlike staging, where
`render.yaml` provisions a separate Postgres *instance* per service. This is
the guide for connecting to it and adding a new database inside it, from a
Windows machine, without installing anything locally.

> **Never commit real credentials to this file or anywhere else in the
> repo.** Every command below uses a placeholder — get the real connection
> string from Render dashboard → `mihaoo-db` → **Connect** → *External
> Connection String* each time you need it.

## Architecture

**One Render Postgres instance, many databases inside it.** `mihaoo-db` is a
single Render-managed Postgres server (Frankfurt region). It is not a
per-service resource — every stateful service's data lives on the same
physical instance, in its own separate database:

| Service | Database name | `<SERVICE>_DATABASE_URL` env var |
|---|---|---|
| `auth-service` | `auth_db` | `AUTH_DATABASE_URL` |
| `tournament-service` | `tournament_db` | `TOURNAMENT_DATABASE_URL` |
| `checklist-service` | `checklist_db` | `CHECKLIST_DATABASE_URL` |
| `analytics-service` | `analytics_db` | `ANALYTICS_DATABASE_URL` |

(`currency-service` and `bonus-service` are stateless by design — no
database. `gateway` and `banner-export-service` don't have one either;
banner-export uses disk storage instead.)

Each service is completely unaware of this sharing — its
`apps/<service>/prisma/schema.prisma` just does
`url = env("<SERVICE>_DATABASE_URL")`, and that env var happens to point at
a database on the shared `mihaoo-db` host rather than a dedicated host. No
code differs between "shared instance" and "dedicated instance" — only the
connection string's host/database-name differs. Prisma also fully namespaces
by database, so this is not the same as multiple services sharing *tables*
— each database has its own schema, its own `_prisma_migrations` history,
and its own set of tables; one service's migration can't affect another
service's database.

**This is a deliberate departure from the staging model.** `render.yaml` (in
this repo) provisions a *separate Postgres instance per service* for staging
— `mihaoo-auth-db-staging`, `mihaoo-tournament-db-staging`, etc. Production
was hand-built in the Render dashboard before that blueprint existed and
was never migrated to match it; it consolidates everything onto one
instance instead. Trade-offs worth knowing if you're touching production:

- **Cheaper** — one Postgres instance/plan instead of four.
- **Shared blast radius** — the instance going down, running out of disk, or
  hitting its connection limit affects *every* service at once, not just
  one. There's no isolating a noisy/broken service's database load from the
  others.
- **Shared `max_connections`** — every service's Prisma connection pool
  draws from the same instance-wide connection limit. Adding a new service
  (like `analytics-service`) means one more pool competing for the same
  budget; worth keeping an eye on if connection errors show up under load.
- **One backup/restore boundary** — a restore of `mihaoo-db` restores (or
  rolls back) every service's database together; you can't restore just
  `analytics_db` to a point in time independently of `auth_db`.
- **Credentials are shared too** — the same Postgres user/password
  authenticates to every database on the instance (Postgres grants are
  per-database, but the login itself is instance-wide). There's no
  per-service DB user/credential isolation today.

**Internal vs. external connection strings.** Render exposes two connection
strings per Postgres instance:
- **External** (`...@dpg-<id>.frankfurt-postgres.render.com/<db>`) — routes
  over the public internet. Use this from your laptop (see the guide below).
- **Internal** (`...@dpg-<id>/<db>`, no `.frankfurt-postgres.render.com`
  suffix) — routes over Render's private network. Use this for
  `<SERVICE>_DATABASE_URL` on any service that itself runs on Render (in the
  same region as `mihaoo-db`) — it's the recommended path service-to-service,
  and avoids the connection reliability issues External can have when used
  from inside Render's own network.

## Prerequisites

- Docker Desktop running. That's it — `psql` isn't installed locally; we run
  it from the official `postgres` Docker image instead, so nothing extra
  needs to be installed or kept on `PATH`.

## 1. Connect (external connection string — for connecting from outside Render, e.g. your laptop)

Since Docker is already available on your machine, the fastest path is to
skip installing Postgres client tools entirely and just run `psql` from the
official Postgres image. From `cmd.exe` or PowerShell:

```
docker run -it --rm postgres psql "postgresql://mihaoodb_user:<password>@dpg-da7c6hqd0e5s73e3sdhg-a.frankfurt-postgres.render.com/mihaoodb"
```

- `-it` gives an interactive session, `--rm` removes the container on exit —
  nothing is left behind on your machine.
- First run pulls the `postgres` image (~150 MB) if it isn't cached yet.
- Always quote the connection string — unquoted, the `@`/`:` characters can
  get mangled by the shell.

## 2. List existing databases on the instance

Once connected (`psql` prompt shows `mihaoodb=>`):

```sql
SELECT datname FROM pg_database WHERE datistemplate = false;
```

(Equivalent to `\l`, minus the noise of Postgres' built-in template
databases.)

## 3. Create a new database

Still inside the same `psql` session:

```sql
CREATE DATABASE analytics_db;
```

Re-run the query from step 2 to confirm it now shows up. Exit with `\q`.

## 4. Build the new database's connection string

Same host/user/password/port as the external connection string in step 1 —
just swap the database name at the end:

```
postgresql://<user>:<password>@dpg-da7c6hqd0e5s73e3sdhg-a.frankfurt-postgres.render.com/analytics_db
```

## 5. Apply the service's Prisma schema to it

From your machine (PowerShell/cmd), with that URL passed as `DATABASE_URL`:

```
set DATABASE_URL=postgresql://<user>:<password>@dpg-da7c6hqd0e5s73e3sdhg-a.frankfurt-postgres.render.com/analytics_db
npm run prisma:deploy:analytics
```

(PowerShell: `$env:DATABASE_URL = "..."` instead of `set`.)

`prisma:deploy:analytics` runs `prisma migrate deploy` against
`apps/analytics-service/prisma/schema.prisma` — non-interactive, safe to
re-run, and only applies already-committed migrations (never generates new
ones, never drops data).

## 6. Point the service at it in Render

On the relevant service in the Render dashboard → Environment:

```
ANALYTICS_DATABASE_URL=postgresql://<user>:<password>@dpg-da7c6hqd0e5s73e3sdhg-a.frankfurt-postgres.render.com/analytics_db
```

Then redeploy that service so it picks up the new env var.
