<!-- SYNOPSIS: Open Contradictions & Architecture Risk Register -->

# Open Contradictions & Architecture Risk Register

| Field | Value |
|-------|--------|
| **Purpose** | Living register of architecture drift, unresolved tensions, and blockers |
| **Authority** | Subordinate to SSOT; **audit tier** — not constitutional law |
| **Last Updated** | 2026-05-31 (OC-014 RESOLVED; OIL race + JSONB path RESOLVED; OC-015 NEW) |
| **Maintainer** | Resident Architect missions (`prompts/00-RESIDENT-ARCHITECT.md`) |
| **Kernel index** | `docs/TSOS_PLATFORM_KERNEL.md` |

**How to use:** Add rows when discovered; mark **RESOLVED** with receipt link when fixed. Do not delete rows — append resolution.

---

## Active contradictions & risks

### OC-001 — Am 44 vs Am 46 “supreme” layer tension

| Field | Value |
|-------|--------|
| **Status** | **PARTIAL** — kernel orchestrates both (`services/tsos-platform-kernel.js`) |
| **Severity** | Medium |
| **Resolution direction** | TSOS Platform Kernel orchestrates Am 44 + Am 46 as drivers |
| **Proof** | `docs/TSOS_PLATFORM_KERNEL.md`, `server.js` platformKernel wiring |
| **Label** | **KNOW** |

---

### OC-002 — OCL route boot bug (missing import)

| Field | Value |
|-------|--------|
| **Status** | **RESOLVED** (2026-05-24) |
| **Proof** | `startup/register-runtime-routes.js` imports `createOperatorConsumptionLedgerRoutes` |
| **Label** | **KNOW** |

---

### OC-003 — `canMarkBuildDone()` not wired into `buildAndCommit()`

| Field | Value |
|-------|--------|
| **Status** | **PARTIAL** — wired via `platformKernel.wrapBuild()` → `recordBuildComplete` + `canMarkBuildDone` |
| **Severity** | Medium until live build proof |
| **Proof** | `routes/lifeos-council-builder-routes.js` mounts `platformKernel.wrapBuild(buildAndCommit)` |
| **Next** | Prove on committed `/build` with OIL + token receipts when `TOKEN_ACCOUNTING_STRICT=true` |
| **Label** | **KNOW** (wiring); **UNVERIFIED** (live build gate) |

---

### OC-004 — Token ledger stale / no recent activity

| Field | Value |
|-------|--------|
| **Status** | **RESOLVED** (2026-05-31) |
| **Evidence** | Live test mission: `token_usage_log` had 12 rows today (2026-05-31), last write `05:51:27 UTC`. Token rows verified in kernel_receipts for build tasks 20443–20446. Council AI calls metered (7 rows verified earlier, 12 by mission end). |
| **Label** | **KNOW** |

---

### OC-005 — Token / control-plane / kernel APIs 404 on deployed URL

| Field | Value |
|-------|--------|
| **Status** | **RESOLVED** (2026-05-31) |
| **Proof** | Deploy SHA `240982b809`; `npm run kernel:verify` PASS — all health routes HTTP 200 |
| **Label** | **KNOW** |

---

### OC-006 — CCL 0% production

| Field | Value |
|-------|--------|
| **Status** | **OPEN** (expected Phase 0) |
| **Evidence** | Kernel `cclPlaceholder()` no-op only |
| **Label** | **KNOW** |

---

### OC-007 — No unified Decision Ledger

| Field | Value |
|-------|--------|
| **Status** | **OPEN** — kernel stub only (`decisionLedgerStub`) |
| **Label** | **KNOW** |

---

### OC-008 — BuilderOS ≠ LifeOS product boundary

| Field | Value |
|-------|--------|
| **Status** | **OPEN** (recurring drift risk) |
| **Label** | **KNOW** |

---

### OC-009 — `builder-council-review.js` bypasses council / kernel

| Field | Value |
|-------|--------|
| **Status** | **BLOCKED** — documented; 8 P0 hits in bypass report |
| **Evidence** | `docs/architecture/AI_CALL_BYPASS_REPORT.md`; header warning in service |
| **Next** | Phase 2 — route through `callCouncilMember` or unmetered exception receipts |
| **Label** | **KNOW** |

---

### OC-010 — OIL coverage partial

| Field | Value |
|-------|--------|
| **Status** | **RESOLVED** (2026-05-31) |
| **Proof** | C2 job `1cf7aa3f` → `oil.verified: true`, `id: e72fce8a`. Two root causes found and fixed: (1) race condition — `await writeSecurityReceipt` fix; (2) JSONB path mismatch — `buildCanonicalReceiptPayload` stores `task_id` under `details`, `verifyOilReceipt` now queries both `payload->>'task_id'` AND `payload->'details'->>'task_id'` in `services/tsos-platform-kernel.js`. |
| **Label** | **KNOW** |

---

### OC-011 — Memory / lessons not auto-captured from builder

| Field | Value |
|-------|--------|
| **Status** | **OPEN** |
| **Label** | **THINK** |

---

### OC-012 — `server.js` council wrap stub unused

| Field | Value |
|-------|--------|
| **Status** | **RESOLVED** — `platformKernel.wrapCouncilMember(rawCallCouncilMember)` |
| **Proof** | `server.js` Phase 0 kernel block |
| **Label** | **KNOW** |

---

### OC-013 — `routes/tsos-task-ledger-routes.js` not mounted

| Field | Value |
|-------|--------|
| **Status** | **OPEN** — superseded by `build_task_ledger` via control plane |
| **Label** | **KNOW** |

---

### OC-014 — C2 executor fails with BUILDER_DISPATCH_FAILED when builder returns committed=false+null target_file

| Field | Value |
|-------|--------|
| **Status** | **RESOLVED** (2026-05-31) |
| **Severity** | P1 — C2 cannot autonomously commit code; requires explicit target_file in /build call |
| **Evidence** | Jobs `d02b7524` and `4493090b` both returned BUILDER_DISPATCH_FAILED despite HTTP 200 + valid builder output. Root cause: `dispatchBuilderPlan` sends `target_file: plan.target_file` which is null when PBB plan does not inject it. Executor treats `committed=false` as total failure with no /execute fallback. |
| **Fix applied** | `tryExecuteFallback()` added to `services/builderos-governed-loop-executor.js`. When builder returns `ok=true, committed=false, output non-empty`, calls `POST /builder/execute` with resolved target_file (from builderResult or plan). Also fixed `release_mode: 'supervised'` → `'SUPERVISED'` (case mismatch that prevented OIL receipts from being written for all C2 builds). Fallback wired in both repair_attempt 0 and 1 paths. |
| **Proof** | node --check PASS; GAP-FILL Zone 3 — builder governance correctly blocked self-modification. |
| **Label** | **KNOW** |

---

### OC-015 — `proof_status` stuck at `exception` — `canMarkBuildDone` ordering issue

| Field | Value |
|-------|--------|
| **Status** | **OPEN** — `proof_status` always `exception`, never `complete` |
| **Severity** | Low (non-blocking — `allow_exception=true` gates pass; builds still commit) |
| **Root cause** | `recordBuildComplete` calls `canMarkBuildDone` BEFORE the UPDATE that sets `end_time`. `canMarkBuildDone` reads DB state where `end_time IS NULL` → returns `complete = false` → `proof_status = 'exception'`. The UPDATE then writes `end_time = NOW()` but with `proof_status = 'exception'`. |
| **Also** | `token_receipt_id` in build_task_ledger is null for `token_recent` matches (time-window tokens have no direct row linkage). So `hasToken = false` in the done gate even when token accounting verified. |
| **Next** | Phase 2: Pass `end_time: new Date()` as a param to `recordBuildComplete` and use it in `canMarkBuildDone`'s logic rather than reading from DB. Or compute `proof_status = 'complete'` directly when `hasOil && hasToken_verified`. |
| **Label** | **KNOW** |

---

## Resolved (append only)

| ID | Resolved | Receipt |
|----|----------|---------|
| OC-002 | 2026-05-24 | OCL import in `register-runtime-routes.js` |
| OC-012 | 2026-05-24 | Kernel council wrap in `server.js` |
| OC-005 | 2026-05-31 | Railway deploy SHA `240982b809`; kernel/token/control-plane health 200 |
| OC-004 | 2026-05-31 | 12 token rows today; kernel_receipt token IDs 20443–20446; last write 05:51 UTC |
| OC-014 | 2026-05-31 | `tryExecuteFallback()` + `release_mode: 'SUPERVISED'` fix in `builderos-governed-loop-executor.js`; `await writeSecurityReceipt` race fix in `lifeos-council-builder-routes.js` |
| OC-010 | 2026-05-31 | `verifyOilReceipt` now queries `payload->'details'->>'task_id'` path; C2 job `1cf7aa3f` → `oil.verified: true, id: e72fce8a` |

---

## Review cadence

- **Every Architect Mode mission** — scan for new contradictions
- **Every Conductor session** touching Am 44/45/46 — update if evidence changes
- **After deploy** — re-run `npm run kernel:verify`, `npm run tokens:verify`, `npm run builderos:control-plane:verify`

---

## Change history

| Date | Change |
|------|--------|
| 2026-05-24 | v1 — seeded OC-001 through OC-013 |
| 2026-05-31 | v2 — OC-004 RESOLVED (token ledger active; 12 rows today). OC-014 NEW — C2 /execute fallback gap. Mission: C2 Live Test. |
| 2026-05-31 | v3 — OC-010 RESOLVED (OIL JSONB path fix + race fix). OC-015 NEW (proof_status ordering). Mission: C2 End-to-End Proof. |
| 2026-05-24 | v2 — Phase 0 kernel slice: OC-002/012 RESOLVED; OC-003/005/009/010 PARTIAL/BLOCKED |
