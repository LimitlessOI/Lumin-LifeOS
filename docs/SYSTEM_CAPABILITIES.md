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
| **B1** | **Council builder — list domains** | `GET /api/v1/lifeos/builder/domains` | `COMMAND_CENTER_KEY` or alias; app must mount builder | Same | **PARTIAL on prod** | **KNOW (2026-04-25):** `healthz` **200** + `/domains` **404** = **deploy drift** (route not in image). Fix: redeploy from `main`. One-liner proof: `npm run builder:diagnose-prod`. Doc: `docs/ops/BUILDER_PRODUCTION_FIX.md`. |
| **B2** | **Council builder — `/ready`** | `GET /api/v1/lifeos/builder/ready` | `GITHUB_TOKEN`, `callCouncilMember`, pool, auth keys | Same | **PARTIAL** | 404 on older images; use B1 as gate. |
| **B3** | **Council builder — generate** | `POST /api/v1/lifeos/builder/task` | B2 + provider AI keys on **server** | Same | **SHIPPED** (code) | IDE does not need provider keys if only HTTP to Railway. |
| **B4** | **Council builder — generate + commit** | `POST /api/v1/lifeos/builder/build` | B3 + `GITHUB_TOKEN`, `GITHUB_REPO` | Same | **SHIPPED** (code) | Blocked until B1 works on target origin. |
| **B5** | **One-command Lumin chat `/build`** | `npm run lifeos:builder:build-chat` | B4 | `PUBLIC_BASE_URL`, command key | **SHIPPED** (script) | Wraps B4 for `public/overlay/lifeos-chat.html`. |
| **G1** | **Commit file to GitHub** | Used by `/build`, `/execute`; `commitToGitHub()` | `GITHUB_TOKEN`, `GITHUB_REPO` | N/A (server-side) | **SHIPPED** | Conductor triggers via builder routes. |
| **V1** | **Env + builder smoke** | `npm run env:certify` | healthz + R2 + B1 | `PUBLIC_BASE_URL`, command key | **SHIPPED** | Append certification log row on PASS. |
| **V2** | **Builder preflight** | `npm run builder:preflight` | B1–B2 where implemented | `PUBLIC_BASE_URL`, command key (optional for reachability) | **SHIPPED** | May append `data/builder-preflight-log.jsonl`. |
| **V3** | **LifeOS verify** | `node scripts/lifeos-verify.mjs` | `DATABASE_URL`, migrations, many routes | Local or CI | **SHIPPED** | Lane-specific ownership in amendment manifests. |
| **V4** | **TokenSaverOS doctor** | `npm run tsos:doctor` / `npm run system:doctor` | healthz + B1/B2 + model-map + C1 + council health + R2 | `PUBLIC_BASE_URL`, command key aliases, optional `RAILWAY_TOKEN`, optional linked Railway CLI | **SHIPPED** | One-command readiness grade with top blockers; read-only by default. Current production: **25/100 red** until redeploy/auth recovery. |
| **C1** | **Real multi-model gate-change** | `POST /api/v1/lifeos/gate-change/run-preset` etc. | Council provider keys | `COMMAND_CENTER_KEY` + `PUBLIC_BASE_URL` for CLI | **SHIPPED** | See `npm run lifeos:gate-change-run`. |

---

## Gaps (platform — build next, then move row to matrix)

| Want | Blocker / next step |
|------|---------------------|
| **Redeploy without any HTTP** from CI | Needs trusted job + `COMMAND_CENTER_KEY` in CI secret store calling same `POST /railway/deploy`. |
| **Prove builder on prod** | **`npm run builder:diagnose-prod`** — if 404 on `/domains` while `healthz` OK → **redeploy** (`docs/ops/BUILDER_PRODUCTION_FIX.md`); then B1 = 200, then B5. |
| **Server-side “doctor” endpoint** listing all capability self-checks | CLI now exists (V4); HTTP endpoint still missing if browser/Command Center needs the same consolidated view. |

---

## Capability changelog

| Date | Change |
|------|--------|
| 2026-04-24 | Added **V4 TokenSaverOS doctor** (`npm run tsos:doctor` / `system:doctor`), post-redeploy live verification, and local Railway CLI fallback in `system:railway:redeploy`. |
| 2026-04-25 | **B1** row: `healthz` 200 + `/domains` 404 = deploy drift; **`npm run builder:diagnose-prod`** + `docs/ops/BUILDER_PRODUCTION_FIX.md`. |
| 2026-04-22 | Maintenance rule **#4:** receipt-grade script lines → `docs/TSOS_SYSTEM_LANGUAGE.md` (North Star **§2.14**). |
| 2026-04-22 | Initial matrix: Railway R1–R3, builder B1–B5, Git G1, verify V1–V3, council C1; prod builder **PARTIAL**; gaps table; maintenance rule. `scripts/system-railway-redeploy.mjs` + `npm run system:railway:redeploy`. |
