# System capabilities matrix (TokenSaverOS / LifeOS)

**Purpose:** Single place to answer **“what can the running system do without Adam touching Railway/GitHub UI?”** and **which Railway env vars** it depends on. Use with **`docs/ENV_REGISTRY.md`** (what exists in the vault) and **`docs/ENV_DIAGNOSIS_PROTOCOL.md`** (how to debug).

**Authority:** Operational; `docs/SSOT_COMPANION.md` §0.4 points here. North Star / Companion win on conflict.

---

## Maintenance rule (non-negotiable)

Any session that **adds or changes** a self-serve HTTP route, operator script, or Railway integration **must**:

1. Update **this file** — add/adjust a row and append **`## Capability changelog`**.
2. Update **`docs/ENV_REGISTRY.md`** if new env vars are required (category table + deploy inventory when Railway changes).
3. If probes exist, run **`npm run env:certify`** after deploy-changing work and paste a row into **`ENV_REGISTRY.md` → Env certification log** when PASS.
4. If the change adds **operator-facing script output** for builder/Railway/env probes, the **first receipt-grade line** follows **`docs/TSOS_SYSTEM_LANGUAGE.md`** (North Star **§2.14**); see Companion **§0.5H**.

---

## Matrix (routes = on the **running** deploy unless noted)

| ID | Capability | How (HTTP or script) | Server (Railway) env | Operator shell | Status | Notes |
|----|--------------|----------------------|----------------------|------------------|--------|-------|
| **R1** | **Trigger Railway redeploy** | `POST /api/v1/railway/deploy` + `x-command-key`; fallback `x-railway-token`; fallback local `railway redeploy` if CLI linked | `RAILWAY_TOKEN`, `RAILWAY_SERVICE_ID`, `RAILWAY_ENVIRONMENT_ID` | `PUBLIC_BASE_URL`, `COMMAND_CENTER_KEY` (or alias); optional local `RAILWAY_TOKEN`; optional linked Railway CLI | **SHIPPED** | Also: `npm run system:railway:redeploy`. Script now waits for `/healthz` + builder route to prove live deploy after trigger. **KNOW (2026-04-24):** current shell has Railway CLI installed but repo not linked; production command-key path returns 401. Redeploys **current service**; code must already be on the branch Railway builds (e.g. push to `main`). |
| **R2** | **List Railway var names** (masked values) | `GET /api/v1/railway/env` + `x-command-key` | Same as R1 + `RAILWAY_PROJECT_ID` | Same as R1 | **SHIPPED** | Proves server can read vault. |
| **R3** | **Set Railway vars (bulk)** | `POST /api/v1/railway/env/bulk` + body `{ vars: { … } }` | R1 env set | Same as R1 | **SHIPPED** | Policy: non-secret / system-owned toggles preferred; secrets only when platform policy allows. |
| **B1** | **Council builder — list domains** | `GET /api/v1/lifeos/builder/domains` | `COMMAND_CENTER_KEY` or alias; app must mount builder | Same | **SHIPPED** | **KNOW (2026-04-30):** prod `/domains` returns **200** with 20 domain prompt files. Historic 404s were deploy drift on older images; keep `npm run builder:diagnose-prod` for regressions. |
| **B2** | **Council builder — `/ready`** | `GET /api/v1/lifeos/builder/ready` | `GITHUB_TOKEN`, `callCouncilMember`, pool, auth keys | Same | **SHIPPED** | **KNOW (2026-04-30):** prod `/ready` returns **200** and reports commit/council/pool truth. **`codegen.policy_revision`** (and **`builder.codegen_policy_revision`**) proves **deploy parity**; **`Cache-Control: no-store`** avoids stale probes; **`codegen.deploy_commit_sha`** when Railway/GitHub exposes a commit env. |
| **B3** | **Council builder — generate** | `POST /api/v1/lifeos/builder/task` | B2 + provider AI keys on **server** | Same | **SHIPPED** (code) | IDE does not need provider keys if only HTTP to Railway. Optional body **`max_output_tokens`** / **`maxOutputTokens`** (code mode): clamped completion override for large HTML when estimator lags deploy (**supervisor use**). |
| **B4** | **Council builder — generate + commit** | `POST /api/v1/lifeos/builder/build` | B3 + `GITHUB_TOKEN`, `GITHUB_REPO` · optional **`BUILDER_HTML_MAX_OUTPUT_TOKENS_CAP`** (default **65536**, max **128000**) · optional **`BUILDER_CODE_MAX_OUTPUT_TOKENS_CAP`** (default **16384**, max **32768**) on **server** | Same | **SHIPPED** (code) | Large **`.html`** full-file regen uses file-size-aware `maxOutputTokens` with **HTML-specific ceiling** so models are not cut off mid-`<head>` (historic false “missing document structure”). Lower caps if provider returns **413** / errors. Blocked until B1 works on target origin. |
| **B5** | **One-command Lumin chat `/build`** | `npm run lifeos:builder:build-chat` | B4 | `PUBLIC_BASE_URL`, command key | **SHIPPED** (script) | Wraps B4 for `public/overlay/lifeos-chat.html`. |
| **B6** | **Supervised builder daemon receipts** | `GET /api/v1/system/builder-health` + `x-command-key`; optional `log_lines` (≤80) for JSONL tail | Same auth as other `/api/v1/system/*` routes | Command key | **SHIPPED** (code) | Reads **`process.cwd()/data/builder-daemon-state.json`** (+ optional **`builder-daemon-log.jsonl`**). **KNOW:** empty/missing files on cloud deploy unless daemon writes same disk — response stays honest (`stateReadError`, `hint`). Local/operator runner = full receipts. |
| **G1** | **Commit file to GitHub** | Used by `/build`, `/execute`; `commitToGitHub()` | `GITHUB_TOKEN`, `GITHUB_REPO` | N/A (server-side) | **SHIPPED** | Conductor triggers via builder routes. |
| **V1** | **Env + builder smoke** | `npm run env:certify` | healthz + R2 + B1 | `PUBLIC_BASE_URL`, command key | **SHIPPED** | Append certification log row on PASS. |
| **V2** | **Builder preflight** | `npm run builder:preflight` | B1–B2 where implemented | `PUBLIC_BASE_URL`, command key (optional for reachability) | **SHIPPED** | May append `data/builder-preflight-log.jsonl`. |
| **V3** | **LifeOS verify** | `node scripts/lifeos-verify.mjs` | `DATABASE_URL`, migrations, many routes | Local or CI | **SHIPPED** | Lane-specific ownership in amendment manifests. |
| **V4** | **TokenSaverOS doctor** | `npm run tsos:doctor` / `npm run system:doctor` | healthz + B1/B2 + model-map + C1 + council health + R2 | `PUBLIC_BASE_URL`, command key aliases, optional `RAILWAY_TOKEN`, optional linked Railway CLI | **SHIPPED** | One-command readiness grade with top blockers; read-only by default. **KNOW (2026-04-30):** current production scored **100/100 green** on live operator run; remaining weaknesses are local fallback conveniences and recent audit-log failures, not route reachability. |
| **V5** | **Inner supervisor review CLI** | `npm run lifeos:builder:inner-review -- <paths…>` → `POST /api/v1/lifeos/builder/task` `mode: review` | Reviews use **Railway** council routes (not local IDE keys) | `PUBLIC_BASE_URL`, command key | **SHIPPED** (script) | Injects `prompts/lifeos-builder-inner-supervisor.md` + paths. **Use on risky slices** — not every line change (`docs/AUTONOMY_SUPERVISION_RUNBOOK.md`). |
| **V6** | **Builder operator suite (composite)** | `npm run tsos:builder` → `scripts/builder-operator-suite.mjs` | Runs **V2** + **`lifeos:builder:probe`** + **V4** sequentially; prints **`data/builder-daemon-state.json`** summary when file exists | Same as V2 + V4 (`PUBLIC_BASE_URL`, command key) | **SHIPPED** (script) | **Exit:** first failing step wins (preflight **1/2**, probe ≠0, doctor **1** when score under 80). All steps **still print** — full situational picture. See `docs/BUILDER_OPERATOR_ENV.md`. |
| **V7** | **Token efficiency scorecard** | `npm run tsos:tokens` → `scripts/tsos-token-efficiency.mjs` | `GET /api/v1/twin/free-tier`, `GET /api/v1/twin/tokens`, `GET /api/v1/twin/tokens/history` | `PUBLIC_BASE_URL`, command key alias; optional `TSOS_ENFORCE_TOKEN_GRADE=1`, `TSOS_MIN_TOKEN_GRADE` | **SHIPPED** (script) | Computes weighted **free-tier remaining %** (request budget), today avg token savings %, saved tokens/USD, and 7-day trend; emits **A/B/C/D/F** efficiency grade and optional fail-closed gate; appends local receipt at `data/token-efficiency-log.jsonl`. |
| **C1** | **Real multi-model gate-change** | `POST /api/v1/lifeos/gate-change/run-preset` etc. | Council provider keys | `COMMAND_CENTER_KEY` + `PUBLIC_BASE_URL` for CLI | **SHIPPED** | See `npm run lifeos:gate-change-run`. |

---

## Gaps (platform — build next, then move row to matrix)

| Want | Blocker / next step |
|------|---------------------|
| **Redeploy without any HTTP** from CI | Needs trusted job + `COMMAND_CENTER_KEY` in CI secret store calling same `POST /railway/deploy`. |
| **Keep prod builder honest** | Re-run **`npm run tsos:builder`** or **`npm run builder:diagnose-prod`** after deploy-changing work. If `/domains` regresses to 404 while `healthz` stays 200, treat it as deploy drift and redeploy (`docs/ops/BUILDER_PRODUCTION_FIX.md`). |
| **Server-side “doctor” endpoint** listing all capability self-checks | CLI now exists (V4); HTTP endpoint still missing if browser/Command Center needs the same consolidated view. |

---

## Capability changelog

| Date | Change |
|------|--------|
| 2026-05-01 | **B2:** **`/ready`** — **`Cache-Control: no-store`**, **`codegen.deploy_commit_sha`** when env carries a git SHA; **`builder.codegen_policy_revision`** mirror. |
| 2026-04-30 | **B2 / V2:** **`GET …/builder/ready`** **`codegen`** block (**`policy_revision`**, **`supports_max_output_tokens_body`**, **`html_output_estimator`**); **`npm run builder:preflight`** prints it. **`scripts/lifeos-builder-overnight.mjs`** passes JSON task **`max_output_tokens`** into **`POST /builder/build`.** |
| 2026-04-30 | **B3/B4:** Optional JSON **`max_output_tokens`** (alias **`maxOutputTokens`**) on **`/builder/task`** + **`/builder/build`** (code mode; clamped ≤128k) — supervisor completion override when live image estimator is stale. |
| 2026-04-30 | **B4 builder tuning (follow-up):** HTML **`estimateBuilderMaxOutputTokens`** now uses **`max(linear, ceil(chars/1.85)+…)`** so full-overlay regen does not plateau at ~16k request tokens when **`BUILDER_HTML_MAX_OUTPUT_TOKENS_CAP`** alone is insufficient. Same env vars — cap still applies. |
| 2026-04-30 | **B4 builder tuning:** Raised HTML codegen **`maxOutputTokens`** cap in `routes/lifeos-council-builder-routes.js` (env **`BUILDER_HTML_MAX_OUTPUT_TOKENS_CAP`** / **`BUILDER_CODE_MAX_OUTPUT_TOKENS_CAP`**) + clearer validation when Gemini truncates before **`<body>`**; **`docs/BUILDER_OPERATOR_ENV.md`** + **`docs/ENV_REGISTRY.md`** document optional vars. |
| 2026-04-30 | **Reality sync:** B1/B2 promoted to **SHIPPED** and V4 note updated after live operator run showed `/healthz`, `/ready`, `/domains`, `/model-map`, `/gaps`, `/council/health`, and `/railway/env` all returning **200**, with `npm run tsos:doctor` scoring **100/100 green**. |
| 2026-04-29 | **V7 Token efficiency scorecard:** **`npm run tsos:tokens`** (`scripts/tsos-token-efficiency.mjs`) + **V6 composite now includes token-efficiency leg**. Tracks weighted free-tier request budget remaining %, token savings trend, writes `data/token-efficiency-log.jsonl`, and supports **A/B/C/D/F** grade gate via `TSOS_ENFORCE_TOKEN_GRADE` + `TSOS_MIN_TOKEN_GRADE`. |
| 2026-04-29 | **V6 Builder operator suite:** **`npm run tsos:builder`** (`scripts/builder-operator-suite.mjs`) — **`builder:preflight`** → **`lifeos:builder:probe`** → **`tsos:doctor`** + optional daemon **state** read; **`docs/BUILDER_OPERATOR_ENV.md`** pointer. |
| 2026-04-29 | **V5** row: **`npm run lifeos:builder:inner-review`** (`scripts/builder-inner-supervisor.mjs`) + **`prompts/lifeos-builder-inner-supervisor.md`**. |
| 2026-04-29 | **B6** row: `GET /api/v1/system/builder-health` — supervised daemon state + optional log tail from `data/` receipts (`routes/api-v1-core.js`). |
| 2026-04-24 | Added **V4 TokenSaverOS doctor** (`npm run tsos:doctor` / `system:doctor`), post-redeploy live verification, and local Railway CLI fallback in `system:railway:redeploy`. |
| 2026-04-25 | **B1** row: `healthz` 200 + `/domains` 404 = deploy drift; **`npm run builder:diagnose-prod`** + `docs/ops/BUILDER_PRODUCTION_FIX.md`. |
| 2026-04-22 | Maintenance rule **#4:** receipt-grade script lines → `docs/TSOS_SYSTEM_LANGUAGE.md` (North Star **§2.14**). |
| 2026-04-22 | Initial matrix: Railway R1–R3, builder B1–B5, Git G1, verify V1–V3, council C1; prod builder **PARTIAL**; gaps table; maintenance rule. `scripts/system-railway-redeploy.mjs` + `npm run system:railway:redeploy`. |
