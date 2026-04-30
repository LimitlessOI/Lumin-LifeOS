# Builder 24/7 — alpha rollout checklist

Use this for **permanent** supervised automation (not a one-off “overnight” run): one machine or VM with a git working copy, `.env` aligned with Railway builder keys, and PM2 keeping both **API** (`lifeos`) and **builder-daemon** alive.

## What “green” means before alpha testers touch prod

1. **API up:** `curl -sS "$PUBLIC_BASE_URL/healthz"` → **200**.
2. **Builder reachable:** `npm run builder:preflight` → exit **0** from an operator shell with `PUBLIC_BASE_URL` + `COMMAND_CENTER_KEY` (or run `npm run lifeos:builder:probe`).
3. **Daemon receipts (same host as `data/`):**
   - `data/builder-daemon-state.json` → `status` **`healthy`** after at least one full cycle (or expect **`degraded`** + `lastError` if prod flaked — fix before inviting testers).
   - `data/builder-daemon-log.jsonl` → recent line **`daemon_start`** includes **`"mode":"24_7"`**.
4. **Optional HTTP mirror:** `GET /api/v1/system/builder-health` with command key — see `docs/AUTONOMY_SUPERVISION_RUNBOOK.md`.

## Start / restart (operator)

```bash
npm run pm2:start              # lifeos + builder-daemon from ecosystem.config.js
npm run pm2:logs:daemon        # builder-daemon only
npm run pm2:restart:daemon      # after pulling script changes
npm run pm2:restart:all       # restarts **lifeos** + **builder-daemon** (see package.json)
```

Ensure repo root has `.env` or shell exports: **`COMMAND_CENTER_KEY`** (or aliases), **`PUBLIC_BASE_URL`** / **`BUILDER_BASE_URL`**, **`GITHUB_TOKEN`**/**`GITHUB_REPO`** where commits are required.

## Multi-repo / “other projects”

Run **one daemon per clone** (each project root has its own `data/builder-daemon-*.json` and lock). Do not point two daemons at the same directory.

## Cost / safety defaults

- **`BUILDER_DAEMON_SUPERVISE_MODE=probe`** (default in `ecosystem.config.js`) — cheap HTTP checks; no council `/build` every cycle.
- Raise to **`full`** only for periodic regression (more tokens).
- Queue depth per cycle: **`BUILDER_QUEUE_MAX`** (alias **`OVERNIGHT_MAX`**).

## Failure you should not see after deploy

- PM2 **`errored`** on `builder-daemon` because of a **stale lock** — the daemon now removes locks whose PID is dead; if two live processes fight, only one lock winner runs.

Full runbook: **`docs/AUTONOMY_SUPERVISION_RUNBOOK.md`**.

Sustained quality habit (every slice): **`docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`**.
