# Environment Strategy

Per INF-03. Three environment levels: **Local**, **Staging**, **Production**.
For each, the ticket asks for: frontend URL, gateway URL, service URLs,
databases, environment variables, secrets, CORS, storage, deployment process,
ownership.

This doc reflects what's actually verifiable from the repo today. Local is
fully defined by `docker-compose.yml` / `.env.example`. Production is only
partially inferable (from `Dockerfile` comments and
`render-production.postman_environment.json`) — most of its column is
**TBD**, since the real values (secrets, CORS origins, ownership) live in the
hosting dashboard, not in code. Staging does not exist yet as a deployed
environment.

## Local

- **Frontend URL**: not applicable from this repo — no frontend is hosted or
  referenced here. TBD from the frontend repo/team.
- **Gateway URL**: `http://localhost:3000`.
- **Service URLs**: `http://localhost:<port>` per service — `auth` 3001,
  `currency` 3003, `bonus` 3005, `checklist` 3006, `banner-export` 3007,
  `analytics` 3008, `tournament` 3004 (see `.env.example` and
  `docker-compose.yml`; §1 of `docs/service-communication.md` covers how the
  gateway resolves these).
- **Databases**: one Postgres container per stateful service — `auth`,
  `tournament`, `checklist`, `analytics` (`docker-compose.yml`, ports
  5433/5435/5436/5437). `currency-service` and `bonus-service` are stateless
  by design, no database.
- **Environment variables**: documented in `.env.example` (copy to `.env` for
  non-Docker runs; Docker injects its own via `docker-compose.yml`).
- **Secrets**: `.env` is gitignored; `.env.example` ships placeholder values
  only (e.g. `JWT_SECRET=change-me-in-production`).
- **CORS**: not configured — `app.enableCors` is not called anywhere in the
  codebase. Not a local-only gap; see Production.
- **Storage**: local disk — `BANNER_EXPORT_STORAGE=./storage/banner-exports`
  (bare) or a named Docker volume `banner_export_storage` (Compose).
- **Deployment process**: `docker compose up -d --build`, then run each
  service's Prisma migration once (`npm run prisma:migrate:<service>`) — see
  README "Running everything with Docker".
- **Ownership**: whoever is running it locally.

### Known gaps in the local setup (found while writing this doc)

- `docker-compose.yml`'s `gateway` service does not set `CURRENCY_SERVICE_URL`
  or `TOURNAMENT_SERVICE_URL`, but both proxy controllers call
  `configService.getOrThrow(...)` on those keys — `docker compose up` would
  crash the gateway container on boot.
- `currency-service` has no entry in `docker-compose.yml` at all.
- `.env.example` is missing the `TOURNAMENT_SERVICE_PORT`,
  `TOURNAMENT_SERVICE_URL`, and `TOURNAMENT_DATABASE_URL` keys that the real
  local `.env` (and the code) actually use.

## Staging

Does not exist yet. No staging URLs, no staging Postman environment, no
staging config anywhere in the repo — this tier needs to be stood up, not
just documented. **TBD** for every field.

## Production

- **Frontend URL**: TBD — not in this repo.
- **Gateway URL**: `https://mihaoo-gateway.onrender.com`, per
  `render-production.postman_environment.json`. Not confirmed as the
  authoritative source (it's a Postman convenience file, not a deployment
  spec).
- **Service URLs**: TBD — internal-only on Render, not documented anywhere in
  the repo.
- **Databases**: TBD — presumably a managed Postgres per service (mirroring
  local), but connection strings/hosting details aren't in the repo (correct
  — they shouldn't be) and aren't documented elsewhere either.
- **Environment variables**: same key set as `.env.example` is a reasonable
  starting assumption, but not confirmed against what's actually set on the
  host.
- **Secrets**: TBD — no secrets manager or vault referenced anywhere; likely
  entered directly in the Render dashboard, per the `Dockerfile` comment
  ("`APP_NAME` set per-service in the host's dashboard").
- **CORS**: undefined — no `app.enableCors` call exists in the code, so
  production allowed origins are currently unset. Needs a decision (allowed
  frontend origin(s)) and an implementation.
- **Storage**: TBD, and worth flagging — banner-export storage is local disk
  in this codebase; if Render's production filesystem is ephemeral or the
  service ever runs multiple instances, that will not survive restarts/scale.
  Needs a real decision (persistent disk vs. object storage).
- **Deployment process**: appears to be manual, per-service configuration in
  the Render dashboard — no `render.yaml` or other infra-as-code manifest,
  no CI/CD pipeline in the repo (no `.github/workflows`, no `.gitlab-ci.yml`).
- **Ownership**: TBD — no `CODEOWNERS` file or ownership doc exists.

## Open items to resolve

- [ ] Frontend URL(s) for staging/production (from the frontend team/repo).
- [ ] Stand up a staging environment, or explicitly decide this project
      doesn't need one.
- [ ] Confirm production service URLs, database hosts, and env var parity
      with `.env.example`.
- [ ] Decide and implement a CORS policy (currently unset in all
      environments).
- [ ] Decide a production storage strategy for `banner-export-service`
      (persistent disk vs. object storage).
- [ ] Document the deployment process (ideally as a `render.yaml` / CI
      pipeline instead of dashboard-only config) and secrets handling.
- [ ] Assign ownership (a `CODEOWNERS` file, or a table here, per
      service/environment).
- [ ] Fix the local gaps listed above (`CURRENCY_SERVICE_URL` /
      `TOURNAMENT_SERVICE_URL` missing from the gateway's Compose env,
      `currency-service` missing from `docker-compose.yml`, `.env.example`
      missing the `TOURNAMENT_*` keys).
