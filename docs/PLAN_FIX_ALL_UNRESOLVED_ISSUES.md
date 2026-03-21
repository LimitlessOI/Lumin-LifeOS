# Plan: Fix All Unresolved Issues (Truth & Evidence Protocol)

**Purpose:** Run this plan by other ML / team for review before implementation.  
**Source:** `docs/FIX_STATUS_SCAN_REPORT.md` (unresolved + optional items).  
**Status:** DRAFT – pending review.  
**Protocol:** No drift. Facts below are backed by repo paths, tool output, or explicit UNVERIFIED + risk + minimum test.

---

## Known Facts / Unknowns / Next Proof

| Type | Item | Evidence or note |
|------|------|------------------|
| **FACT** | `roi_tracker` is queried by api-cost-savings-revenue; table not created in initDatabase | `core/api-cost-savings-revenue.js:66` (SELECT FROM roi_tracker); grep shows no CREATE TABLE roi_tracker in server.js |
| **FACT** | Cost/TCO endpoints that call roi_tracker | `server.js:9479` GET `/api/v1/revenue/api-cost-savings/status` (getStatusAndProjections); `server.js:9492` GET `/api/v1/revenue/api-cost-savings/action-plan` (generateActionPlan) |
| **FACT** | Health/build/boldtrail status routes exist | `server.js:7848` GET `/healthz`; `server.js:11296` GET `/api/v1/auto-builder/status` (requireKey); `server.js:9506` GET `/api/v1/boldtrail/api/status` (requireKey); `server.js:14814` GET `/api/build/status` |
| **FACT** | Non-protected 0-AI path only logs and proceeds | `server.js:6722-6723` else if (activeAIs === 0) console.log "proceeding with caution" then continues |
| **FACT** | execution_tasks has status column for atomic lock | Table created in initDatabase (server.js:821-838); has status, task_id |
| **UNVERIFIED** | Railway trial status | No screenshot/paste in this doc. Risk: Phase 3 Railway verification may be N/A. **Minimum test:** Check Railway dashboard or run deploy and capture response. |
| **NEXT PROOF** | After Phase 1.1 | Run initDatabase, then `SELECT 1 FROM roi_tracker LIMIT 1` (or hit cost endpoint) – no "relation does not exist" |
| **NEXT PROOF** | After Phase 2.1 | Drop roi_tracker (or use DB without it), hit `/api/v1/revenue/api-cost-savings/status?key=...` – 200 with default metrics |

---

## Decision: migration vs initDatabase

- **If this repo already uses `initDatabase()` as the source of truth for schema:** keep adding `roi_tracker` there.
- **If you want production-grade DB management:** add a dedicated migration later (e.g. `db/migrations/` or `migrations/`).

**Recommendation to other ML:** Do it in `initDatabase()` now; optionally add a formal migration later and backfill from initDatabase if needed.

---

## Overview

| Phase | Scope | Est. effort | Risk |
|-------|--------|-------------|------|
| **Phase 1** | roi_tracker table only + council 0-AI policy (Option A+ with emergency override) | Small | Low |
| **Phase 2** | API cost/revenue resilience (missing table, empty table, missing columns) | Small | Low |
| **Phase 3** | Railway / Groq / overlay verification → single matrix doc | Medium | Medium |
| **Phase 4** | Idea → concept → design flow (feature flags, token caps, skip path) | Large | Medium |
| **Phase 5** | Implement-next-idea endpoint (atomic DB lock) + optional scheduler behind flag | Medium | Low |

---

## Regression test list (must not break)

After any phase, run these (no secrets in URLs; use status endpoints with key in header or query as already required):

| Endpoint | Method | Purpose |
|----------|--------|--------|
| `/healthz` | GET | Server alive (no key) |
| `/api/v1/auto-builder/status` | GET | Auto-builder status (requireKey) |
| `/api/v1/boldtrail/api/status` | GET | BoldTrail integration (requireKey) |
| `/api/v1/revenue/api-cost-savings/status` | GET | Cost/TCO – previously hit roi_tracker (requireKey) |
| `/api/build/status` | GET | Build status (no key in current code) |

**Verify success:** Each returns 200 (or 503 if subsystem not initialized) and no uncaught "relation roi_tracker does not exist".  
**Rollback:** Revert the phase’s commits; re-run this list to confirm prior state.

---

## Phase 1: roi_tracker Table + Council 0-AI Policy (Option A+)

**Goal:** Add the missing table only (no seed row). Enforce “0 AIs blocks all self-modification” by default, with a safe emergency override.

### 1.1 Add `roi_tracker` table in initDatabase (table only)

**Problem:** `core/api-cost-savings-revenue.js:66` queries `roi_tracker`. Table does not exist → getStatusAndProjections / generateActionPlan / analyzeClientUsage throw.

**Approach:** Create the table in `server.js` inside `initDatabase()`. Do **not** rely on a seed row; Phase 2 will make the API resilient to empty result (and missing table).

**Schema (match existing query columns):**

```sql
CREATE TABLE IF NOT EXISTS roi_tracker (
  id SERIAL PRIMARY KEY,
  daily_ai_cost DECIMAL(15,4) DEFAULT 0,
  daily_revenue DECIMAL(15,4) DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  total_cost_saved DECIMAL(15,4) DEFAULT 0,
  cache_hits INT DEFAULT 0,
  cache_misses INT DEFAULT 0,
  micro_compression_saves DECIMAL(15,4) DEFAULT 0,
  last_reset TIMESTAMPTZ DEFAULT NOW()
);
```

**Tasks:**

1. In `server.js`, inside `initDatabase()`, locate a suitable spot (e.g. near other tracking/financial tables such as `daily_spend` / `financial_ledger`).
2. Add the `CREATE TABLE IF NOT EXISTS roi_tracker (...)` statement above.
3. Do **not** add a seed row. Empty table is acceptable; Phase 2 handles it in code.

**Acceptance criteria:**

- Server starts without DB errors.
- `GET /api/v1/revenue/api-cost-savings/status` (with valid key) does not throw “relation roi_tracker does not exist” once Phase 2 is in place; with only Phase 1, the endpoint may still throw until Phase 2 (or return 200 if table exists and code already handles empty – see Phase 2).

**Rollback:** Remove the CREATE TABLE block from initDatabase; no other code changes in this step.

---

### 1.2 Council when 0 AIs: Option A+ (block all + emergency override)

**Problem:** For **non-protected** files, when `activeAIs === 0` the code at `server.js:6722-6723` only logs “proceeding with caution” and still applies the modification. Inconsistent with protected-file behavior and safety.

**Approach:** Default = block **all** modifications when `activeAIs === 0`. Allow override only when **all** of:

- `SELF_MOD_EMERGENCY_OVERRIDE=true` (env),
- Request is authenticated (e.g. requireKey present),
- System logs a loud audit entry and forces a snapshot before applying.

This avoids “false fixed” (claiming 0-AI is safe) while preventing lockout in emergencies.

**Tasks:**

1. In `server.js`, in `SelfModificationEngine.modifyOwnCode()`:
   - After the protected-file block, add a check: if `activeAIs === 0` and `process.env.SELF_MOD_EMERGENCY_OVERRIDE !== 'true'`, then restore from backup (if any), return `{ success: false, error: "No AI council members available - modification rejected for safety" }`.
   - If `activeAIs === 0` and `SELF_MOD_EMERGENCY_OVERRIDE === 'true'`: require that the caller is authenticated (requireKey or equivalent); create an audit log entry (e.g. insert into a table or log with “EMERGENCY SELF-MOD OVERRIDE” + timestamp + file path); call `createSystemSnapshot('Emergency override before self-mod')`; then proceed with modification.
2. Remove or narrow the “proceeding with caution” path so that by default we do **not** apply changes when 0 AIs.

**Acceptance criteria:**

- Default (override not set): no file is modified when `activeAIs === 0`, for both protected and non-protected.
- With override set + auth + audit + snapshot: modification is allowed and is auditable.

**Rollback:** Revert the server.js changes; restore the previous “proceeding with caution” behavior if desired.

---

## Phase 2: API Cost/Revenue Resilience (no reliance on seed row)

**Goal:** Cost/TCO features never throw due to `roi_tracker`: handle **missing table**, **empty table**, and **missing columns** (future-proof with defaults). Do not rely on a seed row; fix “no rows” in code.

**Why:** Seeding hides bugs and can break multi-tenant logic later. Always handle empty result in code; treat seed row as optional cosmetic only.

### 2.1 Defensive handling in api-cost-savings-revenue.js

**Problem:** Single query to `roi_tracker`; no handling for missing table, empty result, or missing columns.

**Approach:** In code, always handle: (1) missing table (catch error), (2) empty result (use defaults), (3) missing columns (default each field so partial rows don’t break).

**Tasks:**

1. In `getCurrentCostMetrics()` (and any other method that reads `roi_tracker`):
   - Wrap the `roi_tracker` query in try/catch.
   - On error (e.g. “relation does not exist” or connection error): log warning once (e.g. “roi_tracker not found; using defaults”), set `roi = {}`.
   - If query succeeds but `roiResult.rows.length === 0`, set `roi = {}`.
   - When building the return object, use explicit defaults for every field (e.g. `parseFloat(roi.daily_ai_cost ?? 0)` or equivalent for each column) so missing columns in future schema changes don’t throw.
2. Ensure returned object always has all fields (dailyCost, dailyRevenue, totalTokens, totalCostSaved, cacheHits, cacheMisses, compressionSaves) with 0 or default values when data is missing.

**Acceptance criteria:**

- With `roi_tracker` table and rows: behavior unchanged (real data).
- With `roi_tracker` missing or empty: endpoints return 200 with zeroed/default metrics; no uncaught exception.

**Rollback:** Revert the try/catch and default logic in api-cost-savings-revenue.js.

---

## Phase 3: Railway / Groq / Overlay Verification (single matrix doc)

**Goal:** Confirm and document what actually works. All Phase 3 results must land in **one place** so “done” is precise and drift is visible.

**Definition of done:** Each item has:

- ✅ working / ❌ broken
- Date tested
- Exact endpoint or command used
- Screenshot or log snippet location (path or link)

**Single source of truth:** Create and maintain **`docs/PROD_VERIFICATION_MATRIX.md`** with the structure below. No scattered “it worked once” notes.

**Reality note (UNVERIFIED):** If Railway is currently trial-expired (e.g. from past screenshots or team knowledge), Phase 3 “Railway verification” is not meaningful until you upgrade Railway or switch to a different hosting target. In that case, document in the matrix: “Railway: not applicable (trial expired)” and the date, so reviewers are not blindsided.

**Template for `docs/PROD_VERIFICATION_MATRIX.md`:**

```markdown
# Production verification matrix
| Item | Status | Date tested | Endpoint / command | Evidence (path or link) |
|------|--------|-------------|--------------------|-------------------------|
| Railway ↔ Ollama tunnel | ✅/❌/N/A | YYYY-MM-DD | e.g. POST /api/v1/chat | docs/... or log path |
| Groq fallback (cost shutdown) | ✅/❌ | ... | ... | ... |
| Overlay UI | ✅/❌ | ... | ... | ... |
```

### 3.1 Railway ↔ Ollama tunnel (HTTP 403)

- Reproduce: deploy to Railway, trigger a request that uses Ollama (e.g. council chat with free model). Capture response and logs.
- Document in matrix: status, date, exact endpoint/command, evidence path.
- If broken: document recommended workaround (e.g. use Groq in production; or mark “N/A” if trial expired).

### 3.2 Groq fallback (MODEL OPTIMIZATION overrides)

- Reproduce: MAX_DAILY_SPEND=0 (or cost shutdown), Ollama unreachable/skipped, trigger council chat. Expected: fallback to Groq.
- Document in matrix. If Groq is not used, find where override happens and document or fix.

### 3.3 Overlay UI

- Test: load overlay, trigger a command that hits the server; confirm request/response and overlay display.
- Document in matrix; optionally add steps to OVERLAY_TESTING_GUIDE.

---

## Phase 4: Idea → Concept → Design (feature flags, token caps, skip path)

**Goal:** Add concept and design steps with explicit controls so cost and latency are bounded and reviewers can disable or limit.

**Controls:**

- `CONCEPT_PHASE_ENABLED=true|false` (default false until proven).
- `DESIGN_PHASE_ENABLED=true|false` (default false).
- `CONCEPT_MAX_TOKENS=...`, `DESIGN_MAX_TOKENS=...` (cap council calls).
- **Skip path:** For “small” tasks (e.g. description under N characters or a simple heuristic), skip concept/design and go straight to implementation (cheap fast path).

### 4.1 Concept development step

- Same as before; in addition:
  - Gate with `CONCEPT_PHASE_ENABLED`; when false, skip and pass idea as-is.
  - When calling council, pass `maxTokens: CONCEPT_MAX_TOKENS` (or equivalent) so cost is bounded.
  - Implement “skip concept/design for small tasks” (e.g. `task.description.length < 200` or configurable threshold).

### 4.2 Design step (optional)

- Same as before; gate with `DESIGN_PHASE_ENABLED`, cap with `DESIGN_MAX_TOKENS`, and respect the same skip path.

### 4.3 Wire into ExecutionQueue

- Before calling pipeline/handleSelfProgramming, if concept (and design) phase is enabled and task is not “small,” call developConcept (and produceDesign); then pass concept/design into implementation. Otherwise use raw idea.

---

## Phase 5: Implement-Next-Idea (atomic DB lock, optional scheduler)

**Goal:** Prevent double-run when multiple callers (or ExecutionQueue + endpoint) try to grab the same task. Use a single atomic update so only one consumer wins.

### 5.1 API with atomic lock

- **Approach:** Use one atomic update to claim the task:
  - `UPDATE execution_tasks SET status = 'running', updated_at = NOW() WHERE task_id = $1 AND status = 'pending' RETURNING *`
  - If 0 rows returned → someone else already claimed it; return `{ ok: true, implemented: false, reason: "no queued ideas" }` or “task already taken.”
  - If 1 row returned → this process owns the task; proceed with implementation path (same as ExecutionQueue for that task type); then update status to completed/failed and set result.
- Secure endpoint (e.g. requireKey). Document in SESSION_HANDOFF or API docs.

**Acceptance criteria:**

- Concurrent calls or ExecutionQueue + endpoint do not both run the same task; only one consumer gets the row.

### 5.2 Optional scheduler

- Behind a feature flag (e.g. `IMPLEMENT_NEXT_IDEAS_SCHEDULER_ENABLED`). When enabled, periodically call the same “implement next idea” logic. Reuse the same atomic UPDATE so scheduler and manual endpoint don’t double-run.

---

## Dependencies and Order

1. Phase 1.1 (roi_tracker table only).
2. Phase 2.1 (api-cost-savings-revenue resilience) – do next so cost endpoints never throw regardless of table/rows.
3. Phase 1.2 (council 0-AI Option A+).
4. Phase 3 (verification → PROD_VERIFICATION_MATRIX.md).
5. Phase 4.1 → 4.3 (concept/design + flags/caps/skip).
6. Phase 5.1 (endpoint + atomic lock); optionally 5.2 (scheduler behind flag).

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| roi_tracker schema change | Phase 2 uses per-field defaults so missing columns don’t throw. |
| 0-AI block locks operator out | Option A+ emergency override with env + auth + audit + snapshot. |
| Concept/design cost and latency | Feature flags + token caps + skip path for small tasks. |
| Double-run of same idea | Atomic UPDATE ... WHERE status = 'pending' RETURNING *; 0 rows = no work. |
| Railway verification not possible | Document “N/A (trial expired)” in PROD_VERIFICATION_MATRIX.md with date. |

---

## “Send to other ML” summary (clean)

- **Phase 1:** Add `roi_tracker` table in initDatabase (table only; no seed row). Enforce “0 AIs blocks all self-modification” by default, with emergency override: `SELF_MOD_EMERGENCY_OVERRIDE=true` + requireKey + loud audit log + forced snapshot.
- **Phase 2:** Make api-cost-savings-revenue never throw: handle missing table, empty rows, missing columns → default metrics in code.
- **Phase 3:** Verify Railway / Groq / Overlay and record all results in **`docs/PROD_VERIFICATION_MATRIX.md`** (status, date, endpoint/command, evidence path). If Railway trial is expired, mark Railway as “not applicable” and document.
- **Phase 4:** Add concept + design steps behind feature flags (`CONCEPT_PHASE_ENABLED`, `DESIGN_PHASE_ENABLED`), token caps (`CONCEPT_MAX_TOKENS`, `DESIGN_MAX_TOKENS`), and a skip path for small tasks.
- **Phase 5:** Add implement-next-idea endpoint with **atomic DB lock** (`UPDATE ... SET status='running' WHERE ... AND status='pending' RETURNING *`; 0 rows = already taken). Optional scheduler behind flag.

**Regression list (must not break):** `/healthz`, `/api/v1/auto-builder/status`, `/api/v1/boldtrail/api/status`, `/api/v1/revenue/api-cost-savings/status`, `/api/build/status`.

---

## Review Checklist for Other ML / Team

- [ ] Phase 1.1: initDatabase vs dedicated migration – agree “initDatabase now; optionally migrate later”?
- [ ] Phase 1.2: Option A+ (block + emergency override) acceptable? Override env name and audit format?
- [ ] Phase 2: Agree “no seed row; fix empty/missing in code”?
- [ ] Phase 3: PROD_VERIFICATION_MATRIX.md as single place; who runs verification; Railway N/A if trial expired?
- [ ] Phase 4: Concept/design schema and flag names; default on/off; skip threshold for “small”?
- [ ] Phase 5: Atomic lock pattern; scheduler default on or off?

---

**Document version:** 2.0  
**Last updated:** 2026-02-03  
**Changelog:** Merged review: no seed row; Option A+; Phase 3 matrix; feature flags + caps + skip; atomic lock; regression list; Railway N/A note; decision note (initDatabase vs migrations).
