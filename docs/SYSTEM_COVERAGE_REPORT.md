<!-- SYNOPSIS: System Coverage Report — Token Accounting Reality Audit -->

# System Coverage Report — Token Accounting Reality Audit

**Date:** 2026-05-24  
**Mode:** Audit only — no code changes, no new amendments  
**Evidence sources:** Repo file reads, `node scripts/verify-token-accounting-current-state.mjs`, `node scripts/verify-builderos-control-plane.mjs` (Neon via `DATABASE_URL` in session shell)

---

## Executive verdict

| Coverage claim | Answer | Classification |
|----------------|--------|----------------|
| **100% accounting coverage** | **NO** | **KNOW** |
| **100% verification coverage** | **NO** | **KNOW** |
| **100% memory coverage** | **NO** | **KNOW** |

**Core law status:** *If it is not in the ledger, it did not happen* — **not enforced system-wide**. Partial enforcement exists only on `callCouncilMember` paths inside `services/council-service.js`.

---

## Item-by-item proof

### TOKEN ACCOUNTING

#### 1. `token_usage_log`

| Field | Value |
|-------|-------|
| **File path** | `db/migrations/20260321_token_usage_log.sql` (schema); writer `services/savings-ledger.js` |
| **Import path** | Not imported directly — written via `createSavingsLedger(pool).record()` |
| **Route path** | Read via `GET /api/v1/tokens/unified*` (fallback query), `GET /api/v1/tokens/verify`, twin dashboard routes |
| **Table name** | `token_usage_log` |
| **Exact evidence** | Migration lines 8–20 create table. Verify script output: `"tul": true`, `row_count: 52`, `min_logged_at: 2026-03-22`, `max_logged_at: 2026-03-22`, `rows_last_24h: 0` |
| **Classification** | **KNOW** (schema + 52 historical rows). **UNVERIFIED** for current production activity (0 rows in last 24h). |

---

#### 2. `savings-ledger`

| Field | Value |
|-------|-------|
| **File path** | `services/savings-ledger.js` |
| **Import path** | `server.js` line 75: `import { createSavingsLedger } from "./services/savings-ledger.js"`; `services/council-service.js` line 11 (import only, instance injected); `routes/twin-routes.js` line 277 dynamic import |
| **Route path** | Indirect — `createApiCostSavingsRoutes` receives `savingsLedger: deps.savingsLedger` at `startup/register-runtime-routes.js` line 126 |
| **Table name** | Writes to `token_usage_log`; reads `conductor_session_savings`, `tsos_savings_report` |
| **Exact evidence** | `record()` INSERT at `services/savings-ledger.js` lines 103–118 targets `token_usage_log`. `server.js` line 535: `const savingsLedger = createSavingsLedger(pool)` |
| **Classification** | **KNOW** (code + wiring). Production write activity **UNVERIFIED** (stale rows). |

---

#### 3. `token-accounting-service`

| Field | Value |
|-------|-------|
| **File path** | `services/token-accounting-service.js` |
| **Import path** | `server.js` line 76: `import { createTokenAccountingService } from "./services/token-accounting-service.js"`; line 536: `createTokenAccountingService({ pool, savingsLedger, logger })`; injected into `createCouncilService` as `tokenAccounting` (line 577) and `registerRuntimeRoutes` deps (line 1014) |
| **Route path** | Used by `routes/token-accounting-routes.js`, `routes/operator-consumption-ledger-routes.js`, `services/builderos-control-plane-service.js` |
| **Table name** | Reads/writes `token_usage_log` (via `savingsLedger.record`), `ai_unmetered_exceptions`, `unified_token_accounting_report`, `operator_consumption_ledger` |
| **Exact evidence** | Export `createTokenAccountingService` line 21. `recordMeteredCall` delegates to `savingsLedger.record` (lines 101–131). `recordUnmeteredException` INSERT into `ai_unmetered_exceptions` (lines 45–47). Council uses via `recordMetered` → `tokenAccounting.recordMeteredCall` (`services/council-service.js` lines 100–131, 130–131) |
| **Classification** | **KNOW** on disk + wired. Neon tables for unmetered/unified view **BLOCKED** (not applied). |

---

#### 4. `unified_token_accounting_report`

| Field | Value |
|-------|-------|
| **File path** | `db/migrations/20260532_unified_token_accounting_view.sql` |
| **Import path** | N/A (SQL view) |
| **Route path** | `GET /api/v1/tokens/unified`, `/unified/today`, `/unified/history` (`routes/token-accounting-routes.js` lines 10–78) |
| **Table name** | View `unified_token_accounting_report` (UNION of `token_usage_log`, `operator_consumption_ledger`, `conductor_session_savings`, `token_optimizer_daily`) |
| **Exact evidence** | Migration line 7: `CREATE OR REPLACE VIEW unified_token_accounting_report`. Verify script: `"uta": false` on Neon. API returns 404 on deployed Railway (verify-builderos-control-plane: `HTTP 404`) — code not deployed or route unreachable |
| **Classification** | **KNOW** migration on disk. **BLOCKED** on production DB. **UNVERIFIED** live API. |

---

#### 5. `ai_unmetered_exceptions`

| Field | Value |
|-------|-------|
| **File path** | `db/migrations/20260531_operator_consumption_ledger.sql` lines 37–48 |
| **Import path** | Written by `services/token-accounting-service.js` `recordUnmeteredException()` |
| **Route path** | No dedicated route; surfaced in `GET /api/v1/tokens/unified/health` and `GET /api/v1/builderos/control-plane/health` |
| **Table name** | `ai_unmetered_exceptions` |
| **Exact evidence** | Migration creates table. Verify script: `"aue": false` on Neon. Enforcement script confirms migration file contains table name |
| **Classification** | **KNOW** on disk. **BLOCKED** on production DB (migration not applied). |

---

#### 6. `operator_consumption_ledger`

| Field | Value |
|-------|-------|
| **File path** | `db/migrations/20260531_operator_consumption_ledger.sql` lines 8–29; `services/operator-consumption-ledger-service.js` |
| **Import path** | `services/token-accounting-service.js` line 6: `createOperatorConsumptionLedgerService`; exposed as `tokenAccounting.ocl` |
| **Route path** | **INTENDED:** `POST /api/v1/tokens/operator/record`, `GET /api/v1/tokens/operator/recent`, `GET /api/v1/tokens/operator/summary` (`routes/operator-consumption-ledger-routes.js`) |
| **Table name** | `operator_consumption_ledger` |
| **Exact evidence** | Verify script: `"ocl": true`, `row_count: 0`. **Runtime defect:** `startup/register-runtime-routes.js` line 334 calls `createOperatorConsumptionLedgerRoutes(...)` but **no import exists** in lines 1–81 — would throw `ReferenceError` at boot when `deps.tokenAccounting` is set |
| **Classification** | **KNOW** table exists on Neon (0 rows). OCL API mount **BLOCKED** (missing import). Manual Cursor path **UNVERIFIED** end-to-end. |

---

### BUILDER CONTROL PLANE

#### 7. `builderos-control-plane-service`

| Field | Value |
|-------|-------|
| **File path** | `services/builderos-control-plane-service.js` |
| **Import path** | `server.js` line 77: `import { createBuilderOSControlPlaneService }`; line 537: `createBuilderOSControlPlaneService({ pool, tokenAccounting, logger })`; passed to routes as `deps.builderOSControlPlane` |
| **Route path** | Consumed by `routes/builderos-control-plane-routes.js` |
| **Table name** | Reads/writes `build_task_ledger`; reads `token_usage_log`, `ai_unmetered_exceptions`, `security_receipts`, `unified_token_accounting_report` |
| **Exact evidence** | Export line 12. `recordBuildStart` INSERT line 19. `getMeasurementHealth` lines 318–368 |
| **Classification** | **KNOW** on disk + wired in `server.js`. Not called from `lifeos-council-builder-routes.js` (**THINK**: builder bypasses control plane). Deployed API **UNVERIFIED** (404). |

---

#### 8. `build_task_ledger`

| Field | Value |
|-------|-------|
| **File path** | `db/migrations/20260601_build_task_ledger.sql` |
| **Import path** | N/A — accessed only via `builderos-control-plane-service.js` |
| **Route path** | `POST /api/v1/builderos/control-plane/builds/start`, `/builds/complete`, `GET /builds/:task_id` |
| **Table name** | `build_task_ledger` |
| **Exact evidence** | Migration line 7 creates table. Verify script: `"btl": false` on Neon — migration not applied |
| **Classification** | **KNOW** on disk. **BLOCKED** on production DB. |

---

#### 9. `canMarkBuildDone`

| Field | Value |
|-------|-------|
| **File path** | `services/builderos-control-plane-service.js` lines 249–295 |
| **Import path** | Exported on control plane factory return line 397; used internally by `recordBuildComplete` line 46 |
| **Route path** | `GET /api/v1/builderos/control-plane/builds/:task_id/done-gate`; enforced on `POST /builds/complete` (409 when blocked) |
| **Table name** | Checks `build_task_ledger`, `token_usage_log`, `ai_unmetered_exceptions`, `security_receipts` |
| **Exact evidence** | Function requires token receipt + build end_time + OIL receipt unless `allow_exception`. **Not invoked** from builder `/build` route (grep: no `builderOSControlPlane` in `lifeos-council-builder-routes.js`) |
| **Classification** | **KNOW** implemented. **UNVERIFIED** enforced in production builder flow. |

---

#### 10. `builderos-control-plane-routes`

| Field | Value |
|-------|-------|
| **File path** | `routes/builderos-control-plane-routes.js` |
| **Import path** | `startup/register-runtime-routes.js` line 73: `import { createBuilderOSControlPlaneRoutes }` |
| **Route path** | Mounted at `/api/v1/builderos/control-plane` (lines 341–349): `/health`, `/summary`, `/builds/start`, `/builds/complete`, `/builds/:task_id`, `/builds/:task_id/done-gate`, `/tasks-without-proof` |
| **Table name** | Via service (see above) |
| **Exact evidence** | Mount block lines 341–350. Verify script: routes_mounted check **pass**; api_health **fail** HTTP 404 (deploy drift) |
| **Classification** | **KNOW** in repo. **UNVERIFIED** on running Railway deployment. |

---

## 1. Metered AI call paths

Paths that **KNOW** write to `token_usage_log` (via `recordMetered` → `tokenAccounting.recordMeteredCall` → `savingsLedger.record`):

| Path | Evidence |
|------|----------|
| `services/council-service.js` → `callCouncilMember` | 7× `recordMetered({...})` at lines 1007, 1062, 1360, 1462, 1531, 1600, 1672 |
| Recursive/failover calls | `callCouncilMember` calls itself (lines 866, 883, 1719); `callCouncilWithFailover` calls `callCouncilMember` (line 1945) — **THINK:** all inherit metering |
| Routes using injected `callCouncilMember` | 40+ route files (grep count) — **KNOW** they call council; **THINK** metering applies if they reach `callCouncilMember` |
| `routes/tokenos-routes.js` | Uses `callCouncilMember` in `runOptimized`/`runDirect` (lines 515–542) — metered if council path taken |
| Rules engine zero-AI path | `recordMetered` with provider `logic` (line 1007) — **KNOW** |

**Secondary writer (not council wrapper):**

| Path | Evidence |
|------|----------|
| `routes/twin-routes.js` | Dynamic `createSavingsLedger(pool)` — **KNOW** separate ledger instance; **UNVERIFIED** whether all twin AI calls record |

**Disabled duplicate writer:**

| Path | Evidence |
|------|----------|
| `services/token-optimizer.js` `persistToDB` | Lines 488–492: explicitly disabled; comment says savings-ledger is sole writer |

---

## 2. Unmetered AI call paths

Paths that call providers **without** `recordMetered` / `token_usage_log` (silent from accounting perspective):

| Path | File | Evidence | Classification |
|------|------|----------|----------------|
| Builder council review | `services/builder-council-review.js` | Direct `fetch` to Anthropic, Groq, Perplexity, Cerebras (lines 168, 191, 216, 237, 260, 296, 363, 403) | **KNOW** unmetered |
| TCO direct proxy fallback | `routes/tco-routes.js` | `fetch` OpenAI/Anthropic (lines 1090, 1117, 1150) alongside `callCouncilMember` paths | **KNOW** partial bypass |
| Premium API adapter | `packages/adapters/premium-api.js` | Direct OpenAI/Anthropic fetch (lines 97, 131) | **KNOW** |
| Builder daemon / scripts | `scripts/builder-daemon.js`, `scripts/build-task.js` | Direct OpenAI fetch | **KNOW** (offline scripts) |
| Guide AI | `services/ai-interaction/guide-ai.js` | Direct OpenAI axios | **KNOW** |
| Claude chat (src) | `src/services/claude-chat.js` | Direct Anthropic URL | **KNOW** |
| Word keeper transcriber | `services/word-keeper-transcriber.js` | OpenAI audio API fetch | **KNOW** |
| **Cursor / IDE usage** | N/A | No automatic ingestion; manual OCL intended but API mount broken | **KNOW** gap |
| Scheduled autonomy | Various schedulers | Many use `callCouncilMember` (metered); some core modules **UNVERIFIED** | **THINK** mixed |

**Unmetered exception table:** exists in migration only — **BLOCKED** on Neon; cannot record exceptions in production today.

---

## 3. Builder routes bypassing accounting

| Route / service | Bypass type | Evidence |
|-----------------|-------------|----------|
| `POST /api/v1/lifeos/builder/build` | No `build_task_ledger` write; no control plane | No `builderOSControlPlane` / `recordBuildStart` in `lifeos-council-builder-routes.js` |
| `services/builder-council-review.js` | Direct provider fetch, no ledger | Used in builder pre-review flows |
| `routes/tsos-task-ledger-routes.js` | Legacy `builder_task_ledger` writer | **NOT MOUNTED** in `register-runtime-routes.js` |
| `services/builderos-governed-loop-executor.js` | C2 execute path | OIL audit in trace; **UNVERIFIED** token receipt linkage to `task_id` |
| `scripts/lifeos-builder-continuous-queue.mjs` | Scheduled builder | **THINK** calls builder API; accounting depends on council path only |

**Classification:** **KNOW** builder `/build` does not write `build_task_ledger` or enforce `canMarkBuildDone`.

---

## 4. Routes bypassing OIL

OIL proof = `security_receipts` writes via `writeSecurityReceipt` (8 files, ~15 call sites in runtime code).

| Has OIL integration | Evidence |
|---------------------|----------|
| `routes/lifeos-council-builder-routes.js` | `writeSecurityReceipt` line 1777 (not on every `/build` outcome) |
| `services/builderos-governed-loop-executor.js` | `oil_audit_result` in job trace |
| `routes/oil-security-receipt-routes.js` | `POST` receipt API mounted |
| `routes/gemini-proof-routes.js` | Proof receipt |

| Bypasses OIL (40+ council routes) | Evidence |
|-----------------------------------|----------|
| Most LifeOS product routes | `callCouncilMember` only — no `writeSecurityReceipt` in route files |
| TokenOS proxy | `routes/tokenos-routes.js` — council only, no OIL |
| TC, site-builder, chat, etc. | grep: no `writeSecurityReceipt` in those route files |

**Classification:** **KNOW** OIL is **not** on all AI routes — only builder/gemini/self-repair/governed-loop subsets.

---

## 5. Routes bypassing Memory

Memory Intelligence mounted at:

- `/api/v1/memory/evidence/*` (`startup/register-runtime-routes.js` lines 412, 416)
- `/api/v1/memory/capsules/*`

| Writes memory evidence | Evidence |
|------------------------|----------|
| `routes/lifeos-council-builder-routes.js` | `memorySvc.recordAgentPerformance`, `recordProtocolViolation`, `addEvidence` (lines 1563–1817) |
| `routes/lifeos-gate-change-routes.js` | `createMemoryIntelligenceService` import line 33 |

| Bypasses memory (most routes) | Evidence |
|-------------------------------|----------|
| 40+ routes with `callCouncilMember` | No `createMemoryIntelligenceService` in those route files |
| Council service itself | No memory writes in `council-service.js` |

**Classification:** **KNOW** memory coverage is **builder + gate-change only**, not system-wide.

---

## 6. Routes bypassing future CCL

| Item | Evidence | Classification |
|------|----------|----------------|
| CCL codec / round-trip | No `services/ccl-*.js` in repo | **KNOW** — not built |
| CCL columns on `token_usage_log` | Migration `20260531` lines 72–81 | **KNOW** on disk; **UNVERIFIED** applied on Neon |
| `ccl_used` in council payloads | Fields in `recordMetered` base (`council-service.js` lines 123–124) | **KNOW** wired; always default false |
| Amendment 45 | Phase 0 paper spec only | **BLOCKED** for production |

**Classification:** **KNOW** 0% CCL production coverage; placeholder columns only.

---

## Production DB snapshot (this session)

From verify scripts against Neon:

```
token_usage_log:           EXISTS — 52 rows, 0 in last 24h (stale)
operator_consumption_ledger: EXISTS — 0 rows
ai_unmetered_exceptions:   MISSING (migration not applied)
unified_token_accounting_report: MISSING (migration not applied)
build_task_ledger:         MISSING (migration not applied)
```

Deployed API (PUBLIC_BASE_URL in shell):

```
GET /api/v1/tokens/unified/health          → 404
GET /api/v1/builderos/control-plane/health → 404
```

**Classification:** **KNOW** deploy drift — accounting/control-plane code in repo ≠ running Railway surface.

---

## Coverage percentages (honest)

| Dimension | Estimated coverage | Basis |
|-----------|-------------------|--------|
| **Accounting** | **~30–40%** of runtime AI paths | Council path metered; direct fetch, scripts, Cursor, builder-review unmetered; ledger stale |
| **Verification (OIL)** | **~5–10%** of AI routes | OIL receipts on builder/gemini/self-repair subset only |
| **Memory** | **~5%** of AI routes | Builder + gate-change write evidence; rest do not |
| **CCL** | **0%** | Not in production |

These are **THINK** ranges from grep/static analysis — not measured by runtime instrumentation.

---

## Critical blockers (ordered)

1. **Missing import:** `createOperatorConsumptionLedgerRoutes` used but not imported — OCL routes will crash at boot (**KNOW**).
2. **Migrations not on Neon:** `ai_unmetered_exceptions`, `unified_token_accounting_report`, `build_task_ledger` (**KNOW**).
3. **Deploy drift:** Token/control-plane APIs 404 on deployed base URL (**KNOW**).
4. **Stale ledger:** No `token_usage_log` rows in 24h despite live app (**KNOW**).
5. **Builder not wired:** `/build` does not use control plane or DONE gate (**KNOW**).
6. **Direct fetch bypasses:** `builder-council-review.js`, TCO fallbacks, adapters (**KNOW**).

---

## Conclusion

LifeOS does **not** have 100% accounting, verification, or memory coverage. The repo contains a **partial** Token Accounting OS (Amendment 44) and **partial** BuilderOS Control Plane (Amendment 46), but production evidence shows **stale token data**, **missing DB objects**, **undeployed routes**, and **known unmetered bypass paths**. The ledger is not yet the single source of truth for all model usage.

**Audit complete. No files modified except this report.**
