# analytics-service

Tracks tasks (design/content-ops work) split per brand, the people who do
them, and reporting periods — backs the "Task List" / "Analytics" screens.

## Where it sits

```
Frontend
   │
   ▼
Gateway (:3000)  ──────┬── auth-service (:3001)
  proxies each          ├── checklist-service (:3006)
  request based          └── analytics-service (:3008)  ← this service
  on path
```

The gateway holds no business logic for this domain — `apps/gateway/src/analytics-proxy/*`
just forwards `/team-members`, `/sprints`, `/tasks` requests (with the caller's
JWT) to this service and returns the response as-is.

### Database encapsulation

Each service in this repo owns exactly one Postgres database, and nothing
else is allowed a connection string to it (see `docker-compose.yml` —
`ANALYTICS_DATABASE_URL` only appears under `analytics-service`). Nothing
outside this service ever queries `analytics_db` directly; the HTTP API is
the only door in. The cost of that: no real foreign key can exist from this
service's tables into another service's tables (different database
instances). Where we need a loose link — `TeamMember.authUserId` pointing
at an `auth-service` `User.id` — it's a plain unenforced string, verified
(if ever) by an application-level HTTP call, never a DB constraint. Inside
this service's own database, relations are normal FK-enforced Prisma
relations.

## Entities

```
Sprint                    TeamMember
(id, name,                (id, displayName, email,
 startDate, endDate)       authUserId?, isActive)
 — standalone,                  ▲   ▲   ▲
   never referenced              │   │   │
   by a task                requestedBy  executor  author
                                 │   │   │
                           ┌─────┘   │   └─────┐
                           │         │         │
                     TaskGroup   TaskBrand  TaskComment
                     (shared     (per-brand  (id, body,
                      fields)     row)        taskGroupId)
                        │  1───N   │
                        └──brands──┘
                        │  1───N
                        └─comments─┘
```

- **TeamMember** — the executor/requester roster ("watchlist"). Local to
  this service on purpose: people here don't necessarily have `auth-service`
  logins, and reporting must survive account churn. `authUserId` is an
  optional loose pointer back to a real account, filled in only if/when one
  exists.

- **Sprint** — a labeled `[startDate, endDate]`. Never referenced by a
  foreign key from anywhere — a task's sprint is computed on read (whichever
  Sprint's range contains the task's `reportDate`), so moving a sprint's
  boundaries never requires reassigning old tasks. See
  `SprintsService.findForDate`.

- **TaskGroup** — the fields shared by one "New task" form submission:
  title, description, platform, task type, requester, Jira key, due date,
  report date (the date that decides which reporting period the task's SP
  falls into).

- **TaskBrand** — one row per brand ticked at creation time. **This is the
  entity the Analytics table actually lists, filters, and reports on** —
  each row has its own executor, story points, and status, but all rows
  from one submission share a `taskGroupId`. `@@unique([taskGroupId, brand])`
  stops the same brand being added twice to one task. `closedAt` is set the
  moment a row's `status` flips to `DONE`, cleared if reopened.

- **TaskComment** — belongs to the `TaskGroup`, not to an individual brand
  row — one shared comment thread regardless of which brand's row you
  opened the detail view from.

## Request flows

- **Create** — `POST /tasks` → `TasksService.createTaskGroup` runs one
  Prisma `$transaction`: insert the `TaskGroup`, then one `TaskBrand` per
  selected brand. All-or-nothing — a mid-way failure never leaves a task
  half-created. `differentExecutorsPerBrand: true` requires a
  `brandExecutors` entry for every selected brand; otherwise every brand
  gets the single `executorId`.

- **List (Analytics page)** — `GET /tasks?...` queries `TaskBrand` directly
  (the reportable unit), joined back to its `TaskGroup` for the shared
  filters (platform, task type, requester, report-date range, text search).

- **Detail modal** — `GET /tasks/:id` takes any one `TaskBrand`'s id
  (whatever a table row click gives you), loads its `TaskGroup`, and
  returns that group plus every sibling `TaskBrand` and the comment thread.

- **Delete** — `DELETE /tasks/:id` removes the *whole* `TaskGroup` (cascades
  to every sibling `TaskBrand` and all comments), matching the single
  "Видалити" button in the group detail view rather than deleting one row.

- **Duplicate** — `GET /tasks/:id/duplicate` returns a prefill payload
  (title, description, platform, task type, requester, Jira key, brand
  list) for the create form — it does not persist a new task itself.

## Enums vs. lookup tables

`Platform`, `TaskType`, and `Brand` are fixed Prisma enums — adding a new
value requires a migration (`npm run prisma:migrate:analytics`) and a
deploy. That tradeoff (simplicity + compile-time safety, over
admin-editability) was chosen deliberately over a configurable lookup
table.

One consequence: **enum values can't start with a digit.** The `8P`
platform is modeled as:

```prisma
enum Platform {
  SS
  P8 @map("8P")   // Platform.P8 in code, stored/serialized as the string "8P"
  TL
}
```

`Platform`, `TaskType`, and `Brand`'s current members are a best guess from
the UI screenshots this service was designed from — confirm the full real
list before running the first migration, since extending an enum later
always costs a migration.

## Local development

```bash
# .env — add these three (don't touch .env.example's committed secrets)
ANALYTICS_SERVICE_PORT=3008
ANALYTICS_SERVICE_URL=http://localhost:3008
ANALYTICS_DATABASE_URL=postgresql://postgres:postgres@localhost:5437/analytics_db?schema=public

docker compose up -d analytics-postgres   # or point the URL at any local Postgres

npm run prisma:generate:analytics          # writes src/generated/prisma
npm run prisma:migrate:analytics           # creates tables, prompts for a migration name

npm run start:analytics:dev                # this service on :3008
npm run start:gateway:dev                  # gateway on :3000, proxies to it
```

Seed at least one `TeamMember` before creating tasks —
`TaskGroup.requestedById` and `TaskBrand.executorId` are FKs and must
reference an existing row. Either `POST /team-members` directly (name typed
by hand), or the auth-backed flow below.

## Importing real accounts from auth-service

`TeamMember` rows can come from two places: typed directly
(`POST /team-members`, e.g. someone with no login), or imported from a real
`auth-service` account:

1. `GET /team-members/auth-search?search=...` — a live, uncached call
   (`TeamMembersService.searchAuthUsers`) straight through to `auth-service`'s
   `GET /users`, forwarding the caller's own JWT. Requires the **admin**
   role — see below.
2. `POST /team-members/import { authUserId, email }` — snapshots one result
   from step 1 into a local `TeamMember` row (`displayName` auto-derived
   from the email's local part, e.g. `vladyslav.ko` → `Vladyslav Ko`, unless
   an explicit `displayName` is given). Idempotent on `authUserId` — importing
   the same person twice returns the existing row.

Every read after that (task lists, executor/requester pickers) hits only
this service's own `TeamMember` table — no further calls to `auth-service`.
See the "Cross-service user lookup" discussion this design came from: API
composition (live) at the moment of import, data replication (local
snapshot) for everything after.

**Prerequisite:** `auth-service`'s `GET /users` is gated by
`@Roles('admin')`. `auth-service` only auto-assigns the `user` role on
register — there's no promote-to-admin endpoint yet, so an `admin` `Role`
row has to exist and be attached to a `User` manually (e.g. via Prisma
Studio against `auth_db`) before this flow works for that account.

**Also note:** `auth-service`'s `User` model has no `name` field, only
`email` — that's why `displayName` is derived client/server-side from the
email rather than pulled from `auth-service` directly.

## Open items

- `Platform` / `TaskType` / `Brand` enum members need confirming against the
  real, full list in use before the first migration ships.
- No promote-to-admin flow in `auth-service` yet — required to actually use
  `GET /team-members/auth-search` (see prerequisite above).
