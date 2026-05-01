# Autonomy Supervision Runbook

This runbook ensures builder assignments execute reliably with supervision and proof receipts.

**Permanent 24/7:** The supervised daemon **`npm run lifeos:builder:daemon`** is the **default continuous production posture** — probe/supervise → autonomous **`POST /builder/build`** backlog → backoff → repeat, without a “nights-only” carve-out. Canonical queue CLI: **`npm run lifeos:builder:queue`** (legacy **`lifeos:builder:overnight`** = same runner). Paths like **`builder-overnight-*.jsonl`** retain the old word **for analytic continuity**, not semantics. Alpha checklist: **`docs/BUILDER_24_7_ALPHA_CHECKLIST.md`**.

**Compound improvement:** Between every supervised slice — **evaluate, fix surfaced defects, improve one lever** (retry/spec/verifier/tooling/receipt). Required habit for sustained quality — see **`docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`**.

**Truth / reliability:** Daemon JSONL includes **`reliability_cues`** (bridge to **§2.6** + **AmendMENT 39** evidence ladder — what is **KNOW** vs over-claim). **`docs/BUILDER_RELIABILITY_EPISTEMIC_BRIDGE.md`**.

## Core daemon (24/7)

- Start supervised daemon (foreground):
  - `npm run lifeos:builder:daemon`
- Run one health cycle only:
  - `npm run lifeos:builder:daemon:once`

The daemon performs on every cycle:
1. **`lifeos-builder-supervisor.mjs`** — default **`BUILDER_DAEMON_SUPERVISE_MODE=probe`** (HTTP **`/ready`** + **`/domains` only**, **zero** council **`/build`** cost). Override **`full`** for doc + JS smoke (expensive; periodic regression).
2. **`lifeos-builder-overnight.mjs`** (historical filename — behaviour = **continuous autonomous queue**) — **`BUILDER_QUEUE_USE_CURSOR` / `OVERNIGHT_USE_CURSOR`** (daemon seeds **`OVERNIGHT_*=1`** when both unset): lane cursor under **`data/builder-overnight-cursor.<lane>.json`** prevents rescheduling the same JSON rows every cycle (**`gitignore`** locally); legacy **`data/builder-overnight-cursor.json`** fallback. JSONL **`overnight_idle`** / **`Idle slice`** ⇒ **lane caught up** exit 0 with **zero** **`/build`** spend that invocation.

## Required environment

- `COMMAND_CENTER_KEY` (or `LIFEOS_KEY` / `API_KEY`)
- `BUILDER_BASE_URL` (or `PUBLIC_BASE_URL` / `LUMIN_SMOKE_BASE_URL`)
- `GITHUB_TOKEN` and `GITHUB_REPO` for commit/PR workflows

## Health/proof files

- Daemon state: `data/builder-daemon-state.json`
- Daemon events: `data/builder-daemon-log.jsonl`
- Autonomous queue telemetry (historic filename **`builder-overnight-log.jsonl`**)
- Legacy autonomy proof: `scripts/autonomy/proof-report.md`

## PM2 managed mode (recommended for 24/7)

- `npm run pm2:start` — starts **`lifeos`** + **`builder-daemon`** from `ecosystem.config.js`
- `npm run pm2:logs` — **`lifeos`** logs
- `npm run pm2:logs:daemon` — **`builder-daemon`** only
- `npm run pm2:restart:daemon` / `npm run pm2:restart:all`

PM2 app **`builder-daemon`** runs `scripts/lifeos-builder-daemon.mjs` with autorestart, **min_uptime** / **max_restarts**, and dedicated log files under **`logs/`**. Env commonly includes **`BUILDER_QUEUE_MAX`**, **`BUILDER_QUEUE_USE_CURSOR`** (or **`OVERNIGHT_USE_CURSOR`** legacy), **`BUILDER_DAEMON_SUPERVISE_MODE`**.

### Multi-lane queueing

- Default queue file: **`docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_TASKS.json`**
- Override queue file: **`BUILDER_TASKS_PATH=docs/projects/OTHER_QUEUE.json`**
- Tag/partition the lane explicitly: **`BUILDER_TASK_LANE=site-builder`**
- Cursor files are lane-specific, so different supervised queues do not trample each other.

## Reliability (502 / cold edge)

Both **`supervisor`** and the **autonomous queue runner** retry **`GET /ready`** / **`domains`** on **502/503/504/429**. Queue **`POST /build`** retries on edge (**`OVERNIGHT_BUILD_RETRIES`**, backoff). Supervisor smoke uses **`SUPERVISOR_BUILD_RETRIES`**.

## Efficiency (never re-burn forever)

| Mechanism | What it saves |
|-----------|----------------|
| **`probe`** supervise | No doc/JS council smoke every 30 min (~2 **`/build`** calls avoided) |
| **Lane cursor** (`BUILDER_QUEUE_USE_CURSOR`) | After backlog advances JSONL emits idle events — skips duplicate **`/build`** spam |
| **`--reset-cursor`** | `npm run lifeos:builder:queue -- --reset-cursor` (same as legacy **`overnight`** path) |
| **`BUILDER_QUEUE_CURSOR_WRAP` / legacy `OVERNIGHT_CURSOR_WRAP`** | Bounded sessions default-wrap so continuous runners don’t stall at queue tail forever |

Operators can run **`npm run lifeos:builder:probe`** (= **`--probe-only`**) anytime for a readiness ping.

## Failure behavior

If preflight or the autonomous queue fails:
- daemon marks state `degraded`
- records `lastError` in `data/builder-daemon-state.json`
- waits fail interval (`BUILDER_DAEMON_FAIL_SLEEP_MIN`, default 5 min)
- retries automatically

## HTTP (same machine as receipts)

When the API process can read the repo `data/` directory (local dev or operator runner with working copy), authenticated clients can poll:

- `GET /api/v1/system/builder-health?key=<COMMAND_CENTER_KEY>&log_lines=20` — returns `daemonState` parsed from `data/builder-daemon-state.json`, optional `logTail`: last N lines of `data/builder-daemon-log.jsonl` parsed as JSON objects (`log_lines` 1–80).
- If files are missing, response is still `ok: true` with `stateReadError` and a `hint` (no fake “green” — receipts absent is explicit).

Railway production often has no daemon writing those paths unless you run the daemon in the same filesystem; use file paths in the JSON body for transparency.

## Inner supervisor (cheap review pass — trains “sup” logic in-pipeline)

After a codegen slice that touches **`routes/`**, **`services/`**, or a large **`public/overlay/*.html`** file, run a structured review token pass ( **`council.builder.review`** ) so the council critiques its own trajectory before humans do:

```bash
npm run lifeos:builder:inner-review -- routes/example-routes.js
# optional operator focus text:
npm run lifeos:builder:inner-review -- --focus "SSOT drift + security" -- services/example-service.js
```

Requires the same **`PUBLIC_BASE_URL` + `COMMAND_CENTER_KEY`** as preflight. Protocol text: **`prompts/lifeos-builder-inner-supervisor.md`**.
