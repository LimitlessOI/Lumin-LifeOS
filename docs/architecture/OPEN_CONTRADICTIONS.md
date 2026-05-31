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
| **Status** | OPEN |
| **Severity** | Medium — naming/governance, not runtime break |
| **Evidence** | Am 44 §1: “supreme accounting layer”; Am 46 §1: “supreme measurement/control plane” |
| **Contradiction** | Two amendments claim supremacy in overlapping territory |
| **Resolution direction** | **THINK:** TSOS Platform Kernel orchestrates both as drivers; neither is the full kernel |
| **Label** | **KNOW** (text); **THINK** (resolution) |

---

### OC-002 — OCL route boot bug (missing import)

| Field | Value |
|-------|--------|
| **Status** | OPEN |
| **Severity** | High — boot crash when `tokenAccounting` is set |
| **Evidence** | `startup/register-runtime-routes.js:334` calls `createOperatorConsumptionLedgerRoutes`; no import in lines 1–81 |
| **Expected fix** | `import { createOperatorConsumptionLedgerRoutes } from "../routes/operator-consumption-ledger-routes.js"` |
| **Label** | **KNOW** |

---

### OC-003 — `canMarkBuildDone()` not wired into `buildAndCommit()`

| Field | Value |
|-------|--------|
| **Status** | OPEN |
| **Severity** | High — DONE gate exists but builder bypasses it |
| **Evidence** | `services/builderos-control-plane-service.js:249` implements gate; `routes/lifeos-council-builder-routes.js:1398` `buildAndCommit` has no `canMarkBuildDone` call; `docs/SYSTEM_COVERAGE_REPORT.md` confirms |
| **Label** | **KNOW** |

---

### OC-004 — Token ledger stale / no recent activity

| Field | Value |
|-------|--------|
| **Status** | OPEN |
| **Severity** | Medium — accounting exists but inactive |
| **Evidence** | `token_usage_log`: 52 rows, last `2026-03-22`, 0 rows last 24h (`verify-token-accounting-current-state.mjs`) |
| **Label** | **KNOW** (counts); **UNVERIFIED** (whether production traffic should exist now) |

---

### OC-005 — Token / control-plane APIs 404 on deployed URL

| Field | Value |
|-------|--------|
| **Status** | OPEN |
| **Severity** | High — deploy drift |
| **Evidence** | `docs/SYSTEM_COVERAGE_REPORT.md` — `/api/v1/tokens/*`, `/api/v1/builderos/control-plane/*` return 404 until deploy + migrations |
| **Migrations not on Neon** | `20260532` unified view, `20260601` build_task_ledger; partial `20260531` |
| **Label** | **KNOW** (404); **UNVERIFIED** (current Railway SHA vs local main) |

---

### OC-006 — CCL 0% production

| Field | Value |
|-------|--------|
| **Status** | OPEN (expected — Phase 0) |
| **Severity** | Low until kernel meaning layer needed |
| **Evidence** | Am 45 `DRAFT` / Phase 0 paper only; placeholder cols on `token_usage_log` |
| **Label** | **KNOW** |

---

### OC-007 — No unified Decision Ledger

| Field | Value |
|-------|--------|
| **Status** | OPEN |
| **Severity** | High for kernel authority chain |
| **Evidence** | Am 46 §4.4 Phase 3 `founder_decision_ledger`; today: `pending_adam`, gate-change, SSOT receipts scattered |
| **Impact** | Kernel cannot answer “who authorized this under which SSOT version?” |
| **Label** | **KNOW** |

---

### OC-008 — BuilderOS ≠ LifeOS product boundary

| Field | Value |
|-------|--------|
| **Status** | OPEN (recurring drift risk) |
| **Severity** | Medium — naming and priority confusion |
| **Evidence** | `BUILDEROS_ALPHA_BLUEPRINT.md` §0: “BuilderOS is not LifeOS”; Am 21 LifeOS consumer scope |
| **Risk** | Agents implement product in wrong lane or name “LifeOS Kernel” for platform |
| **Label** | **KNOW** |

---

### OC-009 — `builder-council-review.js` bypasses council / kernel

| Field | Value |
|-------|--------|
| **Status** | OPEN |
| **Severity** | High — unmetered direct provider fetch |
| **Evidence** | `services/builder-council-review.js` — direct `fetch` to Anthropic, Groq, Perplexity, Cerebras (lines ~168–403); used from supervisor path |
| **Impact** | No token receipt, no kernel choke, no OIL |
| **Label** | **KNOW** |

---

### OC-010 — OIL coverage partial

| Field | Value |
|-------|--------|
| **Status** | OPEN |
| **Severity** | Medium |
| **Evidence** | OIL receipts in ~3 route files per constitutional router audit; not all AI/build paths |
| **Label** | **THINK** (audit estimate); **KNOW** (not universal) |

---

### OC-011 — Memory / lessons not auto-captured from builder

| Field | Value |
|-------|--------|
| **Status** | OPEN |
| **Severity** | Medium |
| **Evidence** | Builder `/build` writes some performance memory; `lessons_learned` mostly via `/api/v1/memory/evidence/*` manual path |
| **Label** | **THINK** |

---

### OC-012 — `server.js` council wrap stub unused

| Field | Value |
|-------|--------|
| **Status** | OPEN |
| **Severity** | Low — pre-kernel placeholder |
| **Evidence** | Prior audit: `_origCallCouncil` saved ~line 1183; kernel wrap not applied |
| **Label** | **UNVERIFIED** (exact line — confirm in Conductor session) |

---

### OC-013 — `routes/tsos-task-ledger-routes.js` not mounted

| Field | Value |
|-------|--------|
| **Status** | OPEN |
| **Severity** | Medium — legacy build ledger path orphaned |
| **Evidence** | Am 46 audit; `20260601` adds `build_task_ledger` + legacy compat |
| **Label** | **KNOW** |

---

## Resolved (append only)

| ID | Resolved | Receipt |
|----|----------|---------|
| — | — | — |

---

## Review cadence

- **Every Architect Mode mission** — scan for new contradictions
- **Every Conductor session** touching Am 44/45/46 — update if evidence changes
- **After deploy** — re-run `npm run tokens:verify`, `npm run builderos:control-plane:verify`

---

## Change history

| Date | Change |
|------|--------|
| 2026-05-24 | v1 — seeded OC-001 through OC-013 from token accounting + kernel audits |
