# Builder operator env (names only — never commit values)

**Purpose:** So a Conductor session can run `npm run builder:preflight` and `POST /api/v1/lifeos/builder/build` without guessing. **Values** live in Railway (or your local shell only). **Do not** paste secrets into git, SSOT, or chat logs.

## Token stewardship + audit trail (every call counts)

- **Scheduled / cron AI** — must use **`createUsefulWorkGuard()`** before any `callCouncilMember` / provider call (`services/useful-work-guard.js`). No “heartbeat” model burns.
- **Continuous daemon** — **`BUILDER_DAEMON_SUPERVISE_MODE=probe`** by design: **`/ready` + `/domains`** only between queue cycles; switch to **`full`** when you accept doc+JS smoke **`/build`** cost. **`GET …/builder/gaps`** is the receipt ledger for platform defects — read patterns before blind retries.
- **Throughput honesty** — **`data/builder-continuous-queue-last-run.json`** (daemon also reads legacy **`builder-overnight-last-run.json`**), **`data/builder-daemon-log.jsonl`** — wall-clock vs **`/build`** time; idle slices are **telemetry** for backlog depth / wrap policy, not silent “busy.”
- **SSOT is append-only history** — amendment **`## Change Receipts`** and **`docs/CONTINUITY_LOG.md`** gain **new** rows; agents do **not** delete past rows to tidy. Correct mistakes with a **new** receipt that states the supersession. Git + those logs are the stewarded record.

## Operator digest (log tail → Markdown)

**Command:** `npm run lifeos:builder:digest` — reads local **`data/builder-continuous-queue-log.jsonl`** (+ optional **`data/builder-daemon-log.jsonl`**) and prints **Markdown** to stdout for pasting into **§2.11b** / **`CONTINUITY_LOG`**. **No** AI calls.

| Variable | Default | Role |
|----------|---------|------|
| **`BUILDER_DIGEST_LINES`** | `80` | Max non-empty JSONL lines **per file** (tail) |
| **`BUILDER_DIGEST_QUEUE_LOG`** | `data/builder-continuous-queue-log.jsonl` | Continuous queue JSONL |
| **`BUILDER_DIGEST_DAEMON_LOG`** | `data/builder-daemon-log.jsonl` | Daemon JSONL (optional) |

## Continuous supervised builder (24/7) — wording

Production intent for autonomous work is **non-stop supervised improvement**, not “overnight-only” babysitting:

- Canonical runner: **`npm run lifeos:builder:queue`** → **`scripts/lifeos-builder-continuous-queue.mjs`** (**`lifeos:builder:overnight`** = thin compat wrapper).
- Supervised **`npm run lifeos:builder:daemon`** loops **forever** by default (**`BUILDER_DAEMON_RUN_FOR_MIN=0`**) probe → autonomous **`/build`** queue → backoff → repeat.
- JSONL **`queue_result`** (**legacy alias `overnight_result`** on payloads) · paths **`builder-continuous-queue-*`** (**legacy `builder-overnight-*`** still readable).
- **Trust ramp + review-before-main** — **`docs/BUILDER_AUTONOMY_TRUST_AND_REVIEW_MODEL.md`** (tiered autonomy; **`BUILDER_QUEUE_COMMIT_BRANCH`** commits to review branch until merge).

### Queue commit branch (stay off `main` until reviewed)

| Variable | Role |
|----------|------|
| **`BUILDER_QUEUE_COMMIT_BRANCH`** | If set (e.g. `lifeos/autonomy-review`), **`lifeos-builder-continuous-queue.mjs`** adds **`branch`** to **`POST …/builder/build`** unless a task overrides with its own **`"branch"`**. **Unset** ⇒ default repo branch (**usually `main`**). **`BUILDER_COMMIT_BRANCH`** is legacy alias (same precedence as older scripts). |
| **`BUILDER_QUEUE_REQUIRE_COMMIT_BRANCH`** | If **`1`** / **`true`** / **`yes`**, the queue **exits before `/build`** when **any** selected task lacks a resolved branch (no env branch and no per-task **`branch`**). Use on CI or operator shells where implicit **`main`** commits are forbidden. |
| **`BUILDER_QUEUE_SILENCE_DEFAULT_BRANCH_WARNING`** | If **`1`** / **`true`** / **`yes`**, suppresses the **stderr banner** when some tasks still use implicit default branch. Does **not** disable JSONL telemetry (**`commit_branch_policy`** on **`queue_batch_start`**, **`implicit_default_branch`** on **`task_start`**). Default = warn. |

**Telemetry:** **`queue_batch_start`** JSONL includes **`commit_branch_policy`** (counts + flags). **`builder-continuous-queue-last-run.json`** adds **`commit_branch_receipt`** after successful batches (counts implicit vs explicit commits). **`task_ok`** adds **`target_file`**, **`route_wired_summary`** when the API returns **`route_wired`**. See **`docs/BUILDER_IDEA_FILTERS_REFINEMENT.md`** (refine constraints, don’t discard intent).

## Shell (Conductor laptop / CI secret store)

| Variable | Role |
|----------|------|
| `PUBLIC_BASE_URL` or `BUILDER_BASE_URL` or `LUMIN_SMOKE_BASE_URL` | Base URL for preflight `fetch` (Railway deploy or `http://127.0.0.1:PORT`) |
| `COMMAND_CENTER_KEY` or `COMMAND_KEY` or `LIFEOS_KEY` or `API_KEY` | Must **match** the same-named var on the server; sent as header **`x-command-key`** |

Canonical detail: `docs/ENV_REGISTRY.md`.

## System-visible vault (no dashboard re-proof for Adam)

The **running app** can list Railway variable **names** for the configured service (values are **masked** — first four characters only per key). Use the same auth as builder:

- `GET /api/v1/railway/env` with header `x-command-key: <same as Railway COMMAND_CENTER_KEY or alias>`

Implemented in `server.js` (Railway GraphQL via `RAILWAY_TOKEN` + project/service IDs on the server). **`npm run builder:preflight`** calls this automatically when your shell has a command key and the deploy returns 200 — so Conductor sessions get **machine receipts** that names like `PUBLIC_BASE_URL` / `COMMAND_CENTER_KEY` exist, without implying they are absent from Railway when only the IDE shell was empty.

## Server (Railway — builder commits + council)

| Variable | Role |
|----------|------|
| `GITHUB_TOKEN` | PAT for `commitToGitHub` (required for `POST /builder/build` to finish) |
| `GITHUB_REPO` | `owner/repo` for Contents API |
| `COMMAND_CENTER_KEY` / `LIFEOS_KEY` / `API_KEY` | At least one must match what the operator sends |
| `DATABASE_URL` | Pool + builder audit / probes where applicable |
| Provider keys (e.g. Groq/Gemini) | `callCouncilMember` on the **server** — laptop keys are not required if you only HTTP to Railway |

### Large HTML overlays (`POST /builder/build` truncation)

Optional **server** tuning (Railway) when **`/build`** returns validation errors like truncation before **`<body>`** on **`public/overlay/*.html`**:

| Variable | Default | Role |
|----------|---------|------|
| `BUILDER_HTML_MAX_OUTPUT_TOKENS_CAP` | `65536` (max `128000`) | Completion token ceiling passed to **`callCouncilMember`** when `target_file` / estimator targets **`.html`** |
| `BUILDER_CODE_MAX_OUTPUT_TOKENS_CAP` | `16384` (max `32768`) | Ceiling for non-HTML codegen estimates |

If the provider returns **413** or errors, **lower** these — the caps trade **completeness** vs **provider limits**.

**Supervisor override (HTTP body, same key as `/build`):** Optional **`max_output_tokens`** (alias **`maxOutputTokens`**, positive integer, clamped ≤ **128000**) on **`POST /api/v1/lifeos/builder/task`** and **`POST /api/v1/lifeos/builder/build`** **`mode: code`** — sets council **completion** budget directly when the **auto-estimator on the running image** is behind **`main`** or a slice needs a one-off budget bump. Response may include **`max_output_tokens_supervisor_override: true`** when it applied.

## One composite check (session start)

When you want **preflight + supervisor HTTP probe + TSOS doctor + token-efficiency scorecard + local daemon state + LifeOS operational grade (0–100)** in one run (same env as above):

```bash
npm run tsos:builder
```

Script: `scripts/builder-operator-suite.mjs`. **Matrix:** `docs/SYSTEM_CAPABILITIES.md` **V6–V8** (step 6 = **`lifeos-operational-grade`**). Exit code follows the **first** failing leg (preflight **1** or **2** for key mismatch, probe, doctor, token scorecard, or operational score &lt; **`TSOS_MIN_OPERATIONAL_SCORE`** default 90). Every leg still **prints** so you see the full picture before fixing.

**Per-leg 10/10 mandate:** the suite prints **`ALL SIX LEGS AT 10/10: YES | NO`** and lists each leg still below **10** (independent axes — not one composite average). Receipt: **`data/tsos-builder-suite-last-run.json`** (`all_legs_grade10`, `legs_below_grade10`). Optional strict gate: **`TSOS_ENFORCE_ALL_LEGS_10=1`** → exit **3** when any leg is below **10** but the base composite would otherwise be **0**. See **`docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`** (*Per-leg excellence*).

**Daemon leg grading:** uses rolling **`cycle_ok` / `cycle_failed`** from **`data/builder-daemon-log.jsonl`** (last **N** events, default **40**, **`TSOS_DAEMON_GRADE_WINDOW`**) when enough events exist — reflects **recent** autonomy health, not only lifetime totals. Idea bank: **`docs/TSOS_TEN_UPLIFT_IDEAS.md`**.

**Operational grade only:**

```bash
npm run lifeos:operational-grade
```

Env: **`TSOS_MIN_OPERATIONAL_SCORE`**, **`TSOS_ENFORCE_OPERATIONAL_GRADE=0`** (observe-only). Receipt: `data/lifeos-operational-grade-last-run.json`. **`docs/LIFEOS_SHELL_ACCEPTANCE.md`**.

Standalone token-efficiency run:

```bash
npm run tsos:tokens
```

This reports weighted free-tier request budget **remaining %** + daily token-savings trend and appends a local receipt to `data/token-efficiency-log.jsonl`.

Optional fail-closed grade gate (for unattended runs):

```bash
TSOS_ENFORCE_TOKEN_GRADE=1 TSOS_MIN_TOKEN_GRADE=D npm run tsos:tokens
```

## Bounded autonomous session (~7 hours of builder queue)

Prefer **`probe`** supervise between cycles to save council tokens (**`BUILDER_DAEMON_SUPERVISE_MODE=probe`** — default). For a wall-clock slice that **ends cleanly** (releases daemon lock):

| Mechanism | Example |
|-----------|---------|
| CLI | `--run-for-min 420` (~7h from process start; checks after each cycle before sleeping) |
| Env | **`BUILDER_DAEMON_RUN_FOR_MIN=420`** |
| NPM shortcut | **`npm run lifeos:builder:daemon:7h`** — **bounded soak slice** (**420 min**) on top of continuous design: **15** min cadence · **12** max **`POST /builder/build`** attempts per cycle (**`--queue-max`**, legacy **`--overnight-max`**) |

Continuous queue JSON: **`docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json`** (**`LIFEOS_DASHBOARD_BUILDER_QUEUE.md`** spec). Daemon proof: **`data/builder-daemon-log.jsonl`**. **`GET …/builder/gaps`** captures platform residues.

**Clock time ≠ Railway work.** When **`BUILDER_QUEUE_USE_CURSOR`** / **`OVERNIGHT_USE_CURSOR`** advances past the JSON tail (**`selected.length===0`**), the queue runner can return **instantly** — supervise/sleep keeps going but **`/build`** may be idle. Receipts:

- **`data/builder-continuous-queue-last-run.json`** — **`build_commits`**, **`build_wall_ms_sum`**, **`runner_wall_ms`**, **`idle_slice`**, **`throughput_note`** when idle (**legacy path:** **`builder-overnight-last-run.json`** still read once if present).
- **`daemon_run_limit_reached`** JSONL lines include **`KNOW_session_*`** aggregates for bounded (`--run-for-min`) exits.

For bounded **`--run-for-min`**, the daemon **defaults** **`BUILDER_QUEUE_CURSOR_WRAP=1`** (legacy **`OVERNIGHT_CURSOR_WRAP`**) when both unset — cursor **loops the JSON backlog** vs permanent idle (**opt-out:** set either wrap var **`0`** and keep the lane fed or reset **`data/builder-continuous-queue-cursor.*.json`** / **`npm run lifeos:builder:queue -- --reset-cursor`**).

Ensure **`PUBLIC_BASE_URL`** + **`COMMAND_CENTER_KEY`** are exported (`npm run builder:preflight` exit **0**) before leaving this unattended.

### Optional — skip queue when `/gaps` shows syntax-class failures (token stewardship)

| Variable | Default | Role |
|----------|---------|------|
| **`BUILDER_DAEMON_SKIP_QUEUE_ON_GAPS_SYNTAX`** | *(unset = off)* | Set **`1`** / **`true`** / **`yes`** — before the continuous queue runs, **`GET …/builder/gaps?limit=…`**; if **syntax-like** rows (same rough class as supervisor buckets: `failure_stage` / `failure_reason` contains **syntax**, or **`node --check`**) **≥** threshold, **skip** `lifeos-builder-continuous-queue.mjs` this cycle (supervise still ran). |
| **`BUILDER_DAEMON_GAPS_SYNTAX_MIN`** | **`3`** | Minimum syntax-like rows in the sampled gaps to trigger skip. |
| **`BUILDER_DAEMON_GAPS_ADMISSION_LIMIT`** | **`40`** | **`limit`** query param (capped **5–100**). |

**Supervise lens + gap lookback (optional — no extra `/build` cost for the lens line):**

| Variable | Role |
|----------|------|
| **`BUILDER_DAEMON_CONSEQUENCE_LENS`** | `1`, `true`, or `yes` — daemon passes **`--consequence-lens`** on every supervise leg (prints unintended-consequences / future-back / prior-art reminders; see **`docs/SUPERVISOR_CONSEQUENCE_LENS.md`**) |
| **`BUILDER_SUPERVISOR_GAPS_LIMIT`** | `1`–`100` (server caps at 100) — rows from **`GET /api/v1/lifeos/builder/gaps`** for the supervisor’s RECEIPT bucket summary (**default `50`**) |
| **`BUILDER_SUPERVISOR_GAPS_DOMAIN`** | Optional — same as **`?domain=`** on **`/gaps`** (e.g. `lifeos-platform`) |

CLI overrides when running **`lifeos-builder-supervisor.mjs`** directly: **`--gaps-limit`** · **`--gaps-domain`** · **`--consequence-lens`**.

### Optional — deterministic overlay supervision (not Brief/mockups)

Adam’s word **supervise** = read→grade→fix — see **`docs/SUPERVISION_CODE_READ_CONTRACT.md`**. Daemon default **`probe`** only checks **`/ready` + `/domains`**. To gate **checkout** overlays after each queue batch:

| Variable | Default | Role |
|----------|---------|------|
| **`BUILDER_DAEMON_STATIC_CODE_PASS`** | *(unset)* | Set **`1` / true / yes** → after a **successful** `lifeos-builder-continuous-queue` run, invoke **`npm run lifeos:supervise:static`** (JS syntax via **`check:overlay`** + `<style>` footgun scan under **`public/overlay/**/*.html`**). Logs JSONL **`static_code_supervise_result`**. |
| **`BUILDER_DAEMON_STATIC_CODE_PASS_STRICT`** | *(unset)* | Set **`1`** → failed static pass marks the **daemon cycle failed** (fail-closed) instead of log-only. |
| **`BUILDER_DAEMON_PULL_MAIN_BEFORE_STATIC`** | *(unset)* | Set **`1`** → best-effort **`git pull --ff-only origin main`** before static pass (recommended if **`POST /build`** commits to **`main`** and the daemon host should inspect fresh files). |

Grades are `A/B/C/D/F` from a 100-point score (savings + remaining free-tier budget + day-over-day trend). If enforced and below minimum, script exits non-zero.

## Machine log (system notes readiness)

Each `npm run builder:preflight` appends one JSON line to **`data/builder-preflight-log.jsonl`** (hostname + exit code + reason — **no** key material). Operator can `tail -1` that file after a run. File is **gitignored** so deploy hostnames are not forced into PRs; keep a copy in ops vault if you need audit in git.

## Certify envs are **working** (not only present)

After a slice ships, run **`npm run env:certify`** with `PUBLIC_BASE_URL` + `x-command-key` matching Railway. It probes live routes and prints a **markdown row** for **`docs/ENV_REGISTRY.md` → Env certification log** (see **Env certification playbook** there). Full lane proof may still need `node scripts/lifeos-verify.mjs` (DB + migrations).

## Railway redeploy (system — no dashboard)

After code is on the branch Railway builds (e.g. `main` pushed):

```bash
npm run system:railway:redeploy
```

Requires `PUBLIC_BASE_URL` + command key in shell. Server needs **`RAILWAY_TOKEN`**, **`RAILWAY_SERVICE_ID`**, **`RAILWAY_ENVIRONMENT_ID`** (and **`RAILWAY_PROJECT_ID`** for env routes). See **`docs/SYSTEM_CAPABILITIES.md`** (R1).

## Lumin chat — one-command system build

When **`npm run builder:preflight`** is green and **`GET /api/v1/lifeos/builder/domains`** is not 404:

```bash
npm run lifeos:builder:build-chat
# Inspect payload only:
npm run lifeos:builder:build-chat -- --dry-run
```

Script: `scripts/lifeos-builder-build-chat.mjs`. If `/domains` is **404**, redeploy the service from the branch that includes `createLifeOSCouncilBuilderRoutes` before running.

## Adam directive (Conductor)

1. Export shell vars from Railway (same **names**, same **values** as production for keys).
2. Run `npm run builder:preflight` — if non-zero, **HALT** product hand-authoring; fix env or URL.
3. `POST /api/v1/lifeos/builder/build` — only after exit 0 (or documented `GAP-FILL:` after a **logged failed** attempt).

**If you think a var is “missing”:** read **`docs/ENV_DIAGNOSIS_PROTOCOL.md`** and `docs/ENV_REGISTRY.md` deploy inventory **before** repeating that claim.
