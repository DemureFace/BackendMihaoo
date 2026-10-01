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
- **CORS**: configured — `apps/gateway/src/main.ts` calls `app.enableCors`
  with an allowed-origin list read from the `CORS_ORIGINS` env var
  (comma-separated), falling back to `http://localhost:5173` +
  `https://mihaoo.netlify.app` if unset. Locally, the fallback is normally
  sufficient (unset in `.env.example`).
- **Storage**: local disk — `BANNER_EXPORT_STORAGE=./storage/banner-exports`
  (bare) or a named Docker volume `banner_export_storage` (Compose).
- **Deployment process**: `docker compose up -d --build`, then run each
  service's Prisma migration once (`npm run prisma:migrate:<service>`) — see
  README "Running everything with Docker".
- **Ownership**: whoever is running it locally.

### Known gaps in the local setup

Resolved: `docker-compose.yml`'s `gateway` service now sets
`CURRENCY_SERVICE_URL` and `TOURNAMENT_SERVICE_URL`, `currency-service` has
its own entry, and `.env.example` includes the `TOURNAMENT_*` keys. No open
gaps as of this writing.

## Staging

Stood up per INF-05/INF-06 — see `docs/staging-deployment.md` for the full
runbook (one-time Render Blueprint setup, secrets, migrations, seeding,
verification). Summary:

- **Frontend URL**: TBD — owned by the frontend team; whatever it is, it
  must be set as `CORS_ORIGINS` on the `mihaoo-gateway-staging` service (see
  `render.yaml`).
- **Gateway URL**: `https://mihaoo-gateway-staging.onrender.com`.
- **Service URLs**: `https://mihaoo-<service>-staging.onrender.com` per
  service, per `render.yaml`.
- **Databases**: one Postgres per stateful service — `auth`, `tournament`,
  `checklist`, `analytics` — each named `mihaoo-<service>-db-staging`,
  declared in `render.yaml`, isolated from both local and production.
- **Environment variables**: same key set as `.env.example`; cross-service
  URLs and `APP_NAME` are set directly in `render.yaml`, database URLs via
  `fromDatabase`, and the remaining secrets via the `mihaoo-staging-secrets`
  env var group (values entered by hand in the Render dashboard, never
  committed).
- **Secrets**: `mihaoo-staging-secrets` env var group in `render.yaml`
  (`sync: false` entries) — see `docs/staging-deployment.md` for which
  values go there and why they must not be copied from production.
- **CORS**: `CORS_ORIGINS` set on `mihaoo-gateway-staging` to the staging
  frontend's origin — see above.
- **Storage**: `banner-export-service` gets its own 1 GB persistent disk in
  staging (`render.yaml`'s `disk:` block) — separate from production's.
- **Deployment process**: `render.yaml` (Render Blueprint) — see
  `docs/staging-deployment.md`.
- **Ownership**: TBD — no `CODEOWNERS` file or ownership doc exists yet.

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
- **CORS**: implemented (`app.enableCors` in `apps/gateway/src/main.ts`),
  configurable via the `CORS_ORIGINS` env var. TBD whether production's
  Render dashboard actually has `CORS_ORIGINS` set — if unset, it falls back
  to the two built-in defaults (`http://localhost:5173` +
  `https://mihaoo.netlify.app`), which happens to already cover the known
  production frontend.
- **Storage**: TBD, and worth flagging — banner-export storage is local disk
  in this codebase; if Render's production filesystem is ephemeral or the
  service ever runs multiple instances, that will not survive restarts/scale.
  Needs a real decision (persistent disk vs. object storage).
- **Deployment process**: appears to be manual, per-service configuration in
  the Render dashboard — no `render.yaml` or other infra-as-code manifest,
  no CI/CD pipeline in the repo (no `.github/workflows`, no `.gitlab-ci.yml`).
- **Ownership**: TBD — no `CODEOWNERS` file or ownership doc exists.

## Open items to resolve

- [ ] Frontend URL(s) for staging/production (from the frontend team/repo) —
      needed to actually set `CORS_ORIGINS` on each gateway.
- [x] Stand up a staging environment — `render.yaml` +
      `docs/staging-deployment.md` (INF-05/INF-06). Applying the blueprint
      and filling in the dashboard secrets is still a manual, one-time human
      step.
- [ ] Confirm production service URLs, database hosts, and env var parity
      with `.env.example`.
- [x] Decide and implement a CORS policy — `CORS_ORIGINS` env var,
      implemented in `apps/gateway/src/main.ts`. Confirming it's actually
      *set* on production (vs. relying on the fallback) is still open.
- [ ] Decide a production storage strategy for `banner-export-service`
      (persistent disk vs. object storage). Staging uses a 1 GB Render disk
      (`render.yaml`) as an interim answer; revisit for production.
- [x] Document the deployment process — staging now has one
      (`render.yaml` + `docs/staging-deployment.md`). Production is still
      dashboard-only/undocumented.
- [ ] Assign ownership (a `CODEOWNERS` file, or a table here, per
      service/environment).
