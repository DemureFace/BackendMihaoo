# Analytics Report API — design draft

Status: **draft for review** — not implemented yet. One item is still open
(see "Average SP" below); everything else reflects decisions already made.

**Update (2026-09-29):** the "[Backend][Analytics] Реалізувати облік
прогресу SP за датами" ticket landed the piece this draft was missing —
`TaskBrandProgress`, an append-only per-row journal (`date`, `storyPoints`,
`note`) separate from `TaskBrand.storyPoints` (the estimate) and
`TaskBrand.closedAt` (completion date). Its control example (0.4 SP logged
week 1, 0.6 SP week 2, task closes week 2 → period 1 = 0 done tasks / 0.4
SP, period 2 = 1 done task / 0.6 SP) confirms two things this draft had
wrong or unresolved: **SP-per-period must sum `TaskBrandProgress.date`
entries, not attribute a row's whole `storyPoints` to one period**, and
**"done task" counts per period key off `closedAt`, not `reportDate`**.
Sections below are updated accordingly; "Average SP" itself is more
concretely grounded now but still needs a final confirmed formula (see that
section).

## Scope & filtering

`GET /tasks/report` (name TBD) accepts the same filters as the existing
`GET /tasks` (`QueryTasksDto`), minus `skip`/`take`: `executorId`,
`requestedById`, `brand`, `platform`, `taskType`, `status`, `from`, `to`,
`search`.

Every number below is computed over **all** `TaskBrand` rows matching those
filters — never just the current page of the Task List. That's the "Репорт
рахується за всім відфільтрованим набором, незалежно від пагінації" criterion.

## Periods

A "period" = a `Sprint` row, via `SprintsService.findForDate` (not
currently wired into anything else). Three different dates get bucketed
into a Sprint, for three different purposes — don't collapse these into
one "the task's period":

- **`totalTasks`/task-level grouping** (blocks 2–4, and which rows a
  Sprint "contains" at all): `TaskGroup.reportDate`.
- **SP sums** (`totalSP`, `doneSP`, block 6's pivot cells): sum
  `TaskBrandProgress.storyPoints` bucketed by each entry's own `date` — a
  single row can contribute to multiple Sprints this way.
- **Done-task counts** (`doneTasks`, block 6 if it ever needs a count
  instead of an SP cell): bucket by `TaskBrand.closedAt`'s Sprint, not
  `reportDate`'s.

Anything whose relevant date falls outside every `Sprint` is excluded from
the two period-based blocks (5 and 6) but still counts in blocks 1–4 using
`reportDate`-based totals.

## Blocks

### 1. KPI

One row of top-level numbers over the whole filtered set:

| field | formula |
|---|---|
| `totalTasks` | count of matching `TaskBrand` rows |
| `doneTasks` / `inProgressTasks` | count by `status` |
| `completionRate` | `doneTasks / totalTasks`, **null** if `totalTasks = 0` |
| `totalSP` | `sum(TaskBrandProgress.storyPoints)` over entries belonging to a matching row — **not** `sum(TaskBrand.storyPoints)`, which is the estimate, not credited work |
| `doneSP` | same sum, restricted to entries on rows where `status = DONE` |
| `averageSP` | see "Average SP — open question" below |

Each numeric KPI also carries a period-over-period comparison:

- Only populated when the current filter's `[from, to]` matches **exactly
  one** `Sprint`'s `[startDate, endDate]`. Otherwise `previous`/`changePct`
  are both `null` for every KPI — "previous period" isn't well-defined
  outside that case.
- `previous` — the same metric recomputed for the immediately preceding
  `Sprint` (the one whose `endDate` is closest to, but before, the current
  Sprint's `startDate`), with every other filter (brand/platform/etc.) held
  the same.
- `changePct` — `(current - previous) / previous`; **`null` when
  `previous = 0`** (the zero-base case), never `Infinity`/`NaN`.

### 2. Task types

One row per `TaskType` present in the filtered set:

`taskType`, `count`, `doneCount`, `completionRate`, `totalSP`, `averageSP`,
plus `filters: { taskType }` for drill-down.

### 3. Executors

One row per `TeamMember` who executed at least one matching row:

`executorId`, `executorName`, `count`, `doneCount`, `completionRate`,
`totalSP`, `averageSP`, plus `filters: { executorId }`.

### 4. Brands

One row per `Brand` present in the filtered set:

`brand`, `count`, `doneCount`, `completionRate`, `totalSP`, `averageSP`,
plus `filters: { brand }`.

### 5. Period dynamics

One row per `Sprint` intersecting the filtered range, ordered by
`Sprint.startDate` — the same KPI numbers as block 1 (`totalTasks`,
`doneTasks`, `completionRate`, `totalSP`, `doneSP`, `averageSP`), each
computed for that Sprint only, plus `filters: { from: sprint.startDate, to:
sprint.endDate }`.

### 6. Period × Brand pivot

Grid: rows = Sprint (same set as block 5), columns = Brand (brands actually
present in the filtered set — using the full `/reference-data` brand list
instead is a one-line change if the UI wants empty columns shown too).

- Cell value = **total SP** — `sum(TaskBrandProgress.storyPoints)` for
  entries dated within that Sprint, on rows matching that Brand + the
  current filter selection. (Per the control example, this is a sum over
  journal entries by their own date — not `TaskBrand.storyPoints`
  attributed wholesale to whichever Sprint the row's `reportDate` falls
  in.)
- Each cell also carries `filters: { from: sprint.startDate, to:
  sprint.endDate, brand }`.

## Average SP — open question

Confirmed: averaged over **DONE tasks only**, not in-progress ones. The
original placeholder formula here was `avg(TaskBrand.storyPoints) WHERE
status = DONE` — i.e. averaging the *estimate* field. The progress-journal
ticket confirms that's exactly the wrong reading the ticket warned about:
`storyPoints` is the estimate, set once at creation; `TaskBrandProgress` is
the actual credited work, logged incrementally and possibly summing to
more or less than the estimate. So the corrected baseline is:

```
averageSP = avg( sum(TaskBrandProgress.storyPoints) per row )  WHERE status = DONE
            -- i.e. average, across DONE rows, of each row's own total credited SP
            -- scoped to whatever grouping the block uses
```

**Still not fully confirmed** — this resolves the "estimate vs. credited"
half of the nuance, but not everything:

- Is the denominator ever "per `TaskGroup`" instead of "per `TaskBrand`" —
  i.e. does a task submitted for 3 brands count once or three times toward
  the average?
- For a period-scoped average (blocks 5–6), is a DONE row's *entire*
  credited sum counted in the period it closed in, or only the entries
  actually dated within that period (consistent with how `totalSP`/`doneSP`
  already work above)? The control example's phrasing ("period 2 → 1 task,
  0.6 SP") suggests the latter, but that example is stated for `doneSP`,
  not specifically for `averageSP`.
- Does any block actually want *velocity* (`doneSP` ÷ number of periods)
  rather than a per-task average?

Until this is resolved, every `averageSP` above is the placeholder formula
shown, so it's one thing to search-and-fix once the real rule is known.

## Drill-down contract

Every row/cell above carries a `filters` object shaped like a partial
`QueryTasksDto` (`platform`, `taskType`, `brand`, `executorId`,
`requestedById`, `status`, `from`, `to`). The frontend merges it with
whatever global filters are currently active and calls `GET /tasks` —
reproducing the exact selection that produced the number that was clicked.
That's the "Перехід із метрики до задач відтворює потрібну вибірку"
criterion.
