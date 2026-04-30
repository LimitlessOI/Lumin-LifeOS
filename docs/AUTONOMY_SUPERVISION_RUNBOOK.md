# Autonomy Supervision Runbook

This runbook ensures builder assignments execute reliably with supervision and proof receipts.

**Permanent 24/7:** The supervised loop is the **default production plan** for autonomous builder work—not a temporary “overnight only” mode. Script names still say `overnight` for history; operationally treat it as the **JSON task queue** (`npm run lifeos:builder:queue` aliases the same runner). Alpha checklist: **`docs/BUILDER_24_7_ALPHA_CHECKLIST.md`**.

**Compound improvement:** Between every supervised slice — **evaluate, fix surfaced defects, improve one lever** (retry/spec/verifier/tooling/receipt). Required habit for sustained quality — see **`docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`**.

**Truth / reliability:** Daemon JSONL includes **`reliability_cues`** (bridge to **§2.6** + **AmendMENT 39** evidence ladder — what is **KNOW** vs over-claim). **`docs/BUILDER_RELIABILITY_EPISTEMIC_BRIDGE.md`**.

## Core daemon (24/7)

- Start supervised daemon (foreground):
  - `npm run lifeos:builder:daemon`
- Run one health cycle only:
  - `npm run lifeos:builder:daemon:once`

The daemon performs on every cycle:
1. **`lifeos-builder-supervisor.mjs`** — default **`BUILDER_DAEMON_SUPERVISE_MODE=probe`** (HTTP **`/ready`** + **`/domains` only**, **zero** council **`/build`** cost). Override **`full`** for doc + JS smoke (expensive; periodic regression).
2. **`lifeos-builder-overnight.mjs`** (queue runner) — **`OVERNIGHT_USE_CURSOR=1`** (daemon sets this when unset): advances a lane-specific cursor like **`data/builder-overnight-cursor.lifeos-dashboard-overnight-tasks.json`** so the **same tasks aren’t rebuilt every cycle** (`gitignore` locally). Legacy **`data/builder-overnight-cursor.json`** still loads as fallback. **`overnight_idle`** when the slice is past the end of the queue — exits 0 with **no** `/build` spend.

## Required environment

- `COMMAND_CENTER_KEY` (or `LIFEOS_KEY` / `API_KEY`)
- `BUILDER_BASE_URL` (or `PUBLIC_BASE_URL` / `LUMIN_SMOKE_BASE_URL`)
- `GITHUB_TOKEN` and `GITHUB_REPO` for commit/PR workflows

## Health/proof files

- Daemon state: `data/builder-daemon-state.json`
- Daemon events: `data/builder-daemon-log.jsonl`
- Overnight events: `data/builder-overnight-log.jsonl`
- Legacy autonomy proof: `scripts/autonomy/proof-report.md`

## PM2 managed mode (recommended for 24/7)

- `npm run pm2:start` — starts **`lifeos`** + **`builder-daemon`** from `ecosystem.config.js`
- `npm run pm2:logs` — **`lifeos`** logs
- `npm run pm2:logs:daemon` — **`builder-daemon`** only
- `npm run pm2:restart:daemon` / `npm run pm2:restart:all`

PM2 app **`builder-daemon`** runs `scripts/lifeos-builder-daemon.mjs` with autorestart, **min_uptime** / **max_restarts**, and dedicated log files under **`logs/`**. Env includes **`BUILDER_QUEUE_MAX`**, **`OVERNIGHT_USE_CURSOR`**, **`BUILDER_DAEMON_SUPERVISE_MODE`**.

### Multi-lane queueing

- Default queue file: **`docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_TASKS.json`**
- Override queue file: **`BUILDER_TASKS_PATH=docs/projects/OTHER_QUEUE.json`**
- Tag/partition the lane explicitly: **`BUILDER_TASK_LANE=site-builder`**
- Cursor files are lane-specific, so different supervised queues do not trample each other.

## Reliability (502 / cold edge)

Both **`supervisor`** and **`overnight`** retry **`GET /ready`** and **`domains`** on **502/503/504/429**. Overnight **`POST /build`** retries the same payload on edge errors (`OVERNIGHT_BUILD_RETRIES`, backoff). Supervisor **`POST /build`** retries (`SUPERVISOR_BUILD_RETRIES`).

## Efficiency (never re-burn forever)

| Mechanism | What it saves |
|-----------|----------------|
| **`probe`** supervise | No doc/JS council smoke every 30 min (~2 **`/build`** calls avoided) |
| **Overnight cursor** | After the JSON queue advances, **`overnight_idle`** skips work |
| **`--reset-cursor`** on overnight | `npm run lifeos:builder:overnight -- --reset-cursor` |
| **`OVERNIGHT_CURSOR_WRAP=1`** | Loop queue from the beginning when you intentionally want churn |

Operators can run **`npm run lifeos:builder:probe`** (= **`--probe-only`**) anytime for a readiness ping.

## Failure behavior

If preflight or overnight fails:
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
