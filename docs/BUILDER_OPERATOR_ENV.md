# Builder operator env (names only — never commit values)

**Purpose:** So a Conductor session can run `npm run builder:preflight` and `POST /api/v1/lifeos/builder/build` without guessing. **Values** live in Railway (or your local shell only). **Do not** paste secrets into git, SSOT, or chat logs.

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

When you want **preflight + supervisor HTTP probe + TSOS doctor + token-efficiency scorecard + local daemon state** in one run (same env as above):

```bash
npm run tsos:builder
```

Script: `scripts/builder-operator-suite.mjs`. **Matrix:** `docs/SYSTEM_CAPABILITIES.md` **V6/V7**. Exit code follows the **first** failing leg (preflight **1** or **2** for key mismatch, probe, doctor, or token scorecard). Every leg still **prints** so you see the full picture before fixing.

Standalone token-efficiency run:

```bash
npm run tsos:tokens
```

This reports weighted free-tier request budget **remaining %** + daily token-savings trend and appends a local receipt to `data/token-efficiency-log.jsonl`.

Optional fail-closed grade gate (for unattended runs):

```bash
TSOS_ENFORCE_TOKEN_GRADE=1 TSOS_MIN_TOKEN_GRADE=D npm run tsos:tokens
```

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
