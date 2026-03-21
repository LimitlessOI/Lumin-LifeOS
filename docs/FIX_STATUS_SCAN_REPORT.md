# Fix Status Scan Report
## Full program scan (including uncommitted / unpushed changes)

**Scan date:** 2026-02-03  
**Branch:** pr-cleanup-1 (11 commits ahead of origin)  
**Scope:** All critical issues + modified/untracked files

---

## 1. Critical issues – status

### FIXED (in current codebase)

| # | Issue | Evidence |
|---|--------|----------|
| 1 | **Rollback doesn’t restore files** | `server.js:5736–5756`: `rollbackToSnapshot()` restores `snapshotData.fileContents` and writes files; backup before restore at 5743–5746. |
| 2 | **No file backup in `modifyOwnCode()`** | `server.js:6669–6674`: Backup created before modifications; `6678` passes `[filePath]` into `createSystemSnapshot()` so file is in snapshot. |
| 3 | **JSON parsing risk in rollback** | `server.js:5718–5725`: Safe handling for string vs object; `typeof snapshotData === 'string'` with try/catch `JSON.parse`. |
| 4 | **Council proceeds with no AIs (protected files)** | `server.js:6687–6698`: For protected files, if `activeAIs === 0` we reject, restore from backup, return error. (Non‑protected still proceed with caution at 6722–6723.) |
| 5 | **Snapshots include file contents** | `server.js:5650–5679`: `createSystemSnapshot(reason, filePaths)` reads files and stores in `fileContents` in snapshot_data. |
| 6 | **Execution queue uses self‑programming** | `server.js:6463–6538`: `idea_implementation` uses `ideaToImplementationPipeline.implementIdea()`; `build` uses `handleSelfProgramming()`. |
| 7 | **Self‑funding load balance (roi_tracker)** | `core/self-funding-system.js:36–59`: No longer queries `roi_tracker`; uses `income_drones` and `self_funding_spending` only. Comment at 53: “ROI tracker is in-memory … not a database table”. |
| 8 | **Auto‑builder fixes** | `docs/AUTO_BUILDER_COMPLETION_PROOF.md` + `core/auto-builder.js`: Syntax fix, single `runnerLockActive`, build_artifacts table in server.js:2365. |

### NOT FIXED (still broken)

| # | Issue | Location | Notes |
|---|--------|----------|--------|
| 1 | **Missing table `roi_tracker`** | `core/api-cost-savings-revenue.js:66` | Queries `roi_tracker` (daily_ai_cost, daily_revenue, total_tokens_used, etc.). No `CREATE TABLE roi_tracker` in `server.js` `initDatabase()`. Any call to `apiCostSavingsRevenue.getStatusAndProjections()` or `generateActionPlan()` or `analyzeClientUsage()` will throw. |
| 2 | **Council with no AIs (non‑protected files)** | `server.js:6722–6723` | For non‑protected files, when `activeAIs === 0` we only log “proceeding with caution” and still apply the change. Design choice: either block here too or document as intentional. |
| 3 | **Idea → concept → design → implementation flow** | System-wide | No dedicated concept/design phase; pipeline goes idea → implementation. |
| 4 | **Self‑programming “idea input”** | - | No automatic “pull next idea from queue” into self‑programming; still instruction‑driven. |
| 5 | **Railway / Groq / overlay** | Per SESSION_HANDOFF | Railway tunnel 403, Groq overridden, overlay untested – not re‑verified in this scan. |

---

## 2. Other potential issues (from scan)

### Database / schema

- **`roi_tracker`**  
  - **Used by:** `core/api-cost-savings-revenue.js` only (not self-funding-system).  
  - **Fix options:**  
    - Add to `initDatabase()` in server.js, e.g.  
      `CREATE TABLE IF NOT EXISTS roi_tracker (id SERIAL PRIMARY KEY, daily_ai_cost DECIMAL(15,4), daily_revenue DECIMAL(15,4), total_tokens_used BIGINT, total_cost_saved DECIMAL(15,4), cache_hits INT, cache_misses INT, micro_compression_saves INT, last_reset TIMESTAMPTZ DEFAULT NOW());`  
    - Or change `api-cost-savings-revenue.js` to use other tables / in-memory and handle missing table.

### Modified files (unstaged / not pushed)

- **server.js** – Modified; contains the rollback/backup/council fixes above.  
- **core/auto-builder.js** – Uses `config/runtime-env.js`, `createDbPool` from `services/db.js`, `validators.extractCode`; has receipt logic and build_artifacts.  
- **core/validators.js** – `extractCode()` and validators used by auto-builder; looks consistent.  
- **config/runtime-env.js** – Loads env; requires `COMMAND_CENTER_KEY`; no obvious new bug.  
- **core/video-editing-council.js** – Modified; not re-audited for logic bugs.  
- **core/outreach-automation.js**, **core/stripe-automation.js** – Modified; not re-audited.  
- **routes/website-audit-routes.js**, **public/overlay/** – Modified; not re-audited.

### Untracked files (possible impact)

- **core/crm-sequence-runner.js**, **core/notification-service.js** – New; not integrated in this scan.  
- **lib/resource-governor.js** – New; usage not traced.  
- **docs/AUTO_BUILDER_COMPLETION_PROOF.md**, **docs/AUTO_BUILDER_PATCHES.md** – Describe auto-builder fixes.  
- **tests/auto-builder-scheduler.test.js** – New test; `package.json` may need `test:auto-builder` script (see AUTO_BUILDER_PATCHES.md).  
- **scripts/truth-guard-preflight.js**, **scripts/programming-artifacts-preflight.js** – New; may affect self-programming/artifacts.  
- **products/api-service/routes/** – New; may add routes; not traced into server.

### Dependencies / env

- **auto-builder** uses `services/db.js` `createDbPool` and `config/runtime-env.js`; if those are not loaded before auto-builder runs, receipts/DB can fail.  
- **api-cost-savings-revenue** is lazy-loaded when cost/TCO endpoints are hit; first use will fail until `roi_tracker` exists or the module is made resilient.

---

## 3. Summary table

| Category | Fixed | Not fixed | Notes |
|----------|--------|-----------|--------|
| Rollback restores files | Yes | - | Snapshot stores fileContents; rollback writes them. |
| File backup in modifyOwnCode | Yes | - | Backup + snapshot with file path. |
| JSON parsing in rollback | Yes | - | String/object handled safely. |
| Council blocks when 0 AIs (protected) | Yes | - | Rejects and restores backup. |
| Council when 0 AIs (non‑protected) | - | Optional | Still proceeds with caution. |
| roi_tracker table | - | Yes | Only api-cost-savings-revenue; self-funding no longer uses it. |
| Execution queue → self‑programming | Yes | - | idea_implementation + build paths use pipeline/handleSelfProgramming. |
| Self-funding load balance | Yes | - | Uses income_drones + self_funding_spending. |
| Auto-builder (syntax, lock, build_artifacts) | Yes | - | Per docs and code. |
| Idea→concept→design flow | - | No | Not implemented. |
| API cost/revenue (roi_tracker) | - | No | Needs table or code change. |

---

## 4. Recommended next steps

1. **Resolve `roi_tracker`**  
   - Either add `CREATE TABLE roi_tracker (...)` in `initDatabase()` to match `api-cost-savings-revenue.js` columns, or  
   - Change `api-cost-savings-revenue.js` to not depend on `roi_tracker` (e.g. use other tables or return defaults when table is missing).

2. **Decide non‑protected + 0 AIs**  
   - Either block modifications when `activeAIs === 0` for all files, or document that non‑protected files are allowed with “caution” as intended.

3. **Push and tag**  
   - Current branch has 11 unpushed commits and many unstaged changes that contain the fixes above; push when ready and tag a version after verifying.

4. **Re-verify Railway / Groq / overlay**  
   - Confirm tunnel, Groq fallback, and overlay behavior in deployment and document in SESSION_HANDOFF or similar.

---

## 5. Files touched by this scan

- server.js (rollback, modifyOwnCode, createSystemSnapshot, ExecutionQueue, initDatabase grep)
- core/self-funding-system.js
- core/api-cost-savings-revenue.js
- core/auto-builder.js
- core/validators.js
- config/runtime-env.js
- docs/AUTO_BUILDER_COMPLETION_PROOF.md, docs/AUTO_BUILDER_PATCHES.md
- migrations (list only; no roi_tracker found)
