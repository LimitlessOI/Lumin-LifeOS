# Open Contradictions & Architecture Risk Register

| Field | Value |
|-------|--------|
| **Purpose** | Living register of architecture drift, unresolved tensions, and blockers |
| **Authority** | Subordinate to SSOT; **audit tier** — not constitutional law |
| **Last Updated** | 2026-05-24 |
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
| **Status** | **OPEN** |
| **Evidence** | Neon: 52 rows, last `2026-03-22`, 0 / 24h (post-migration verify) |
| **Label** | **KNOW** |

---

### OC-005 — Token / control-plane / kernel APIs 404 on deployed URL

| Field | Value |
|-------|--------|
| **Status** | **BLOCKED** — deploy drift until Railway picks up post-push SHA |
| **Evidence** | `npm run kernel:verify` — HTTP 404 on `/api/v1/kernel/*`, `/api/v1/tokens/*`, `/api/v1/builderos/control-plane/*` |
| **Neon migrations** | **PARTIAL RESOLVED** — `20260602`, `20260603` applied; unified view exists |
| **Label** | **KNOW** (404); **UNVERIFIED** (deploy SHA after push) |

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
| **Status** | **PARTIAL** — build path writes OIL receipt with `task_id` when supervised |
| **Proof** | `lifeos-council-builder-routes.js` `writeSecurityReceipt` includes `task_id` |
| **Label** | **KNOW** (partial) |

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

## Resolved (append only)

| ID | Resolved | Receipt |
|----|----------|---------|
| OC-002 | 2026-05-24 | OCL import in `register-runtime-routes.js` |
| OC-012 | 2026-05-24 | Kernel council wrap in `server.js` |

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
| 2026-05-24 | v2 — Phase 0 kernel slice: OC-002/012 RESOLVED; OC-003/005/009/010 PARTIAL/BLOCKED |
