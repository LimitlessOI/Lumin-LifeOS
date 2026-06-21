<!-- SYNOPSIS: Phase 0 Audit — Bounded Autonomous Self-Repair -->

# Phase 0 Audit — Bounded Autonomous Self-Repair

> **Date:** 2026-05-24  
> **Authority:** SSOT §2.16 — SYSTEM_AUTHORIZED_UNDER_PB inside approved PB  
> **Auditor:** Conductor (C2) + live Railway probes + `oil-self-repair-audit.mjs`  
> **Honesty:** STALE ≠ VERIFIED. No fake green.

---

## Executive summary

The governed self-repair stack **detects, classifies, and reports** repair needs correctly under §2.16. It **does not execute** authorized repairs. Every self-repair surface is explicitly `read_only: true` / `auto_repair: false`.

**Gap:** Observer → executor. `can_continue_under_approved_pb: true` with 3 system-authorized actions, but no orchestrator calls `POST /api/v1/gemini/proof` or chains phase14 re-cert.

---

## Live Railway state (verified)

| Signal | Value | Honest label |
|--------|-------|--------------|
| `deployed_sha` | `762f90c9f12c…` | KNOW |
| `github_main_sha` | aligned with deploy | KNOW |
| `receipt_commit_sha` | `380d84ddb29e…` | STALE vs deploy |
| `runtime_proof_status` | STALE | KNOW |
| `proof_freshness_overall` | STALE (`gemini_runtime`, `phase14`) | KNOW |
| `ready_for_supervised` | **false** | KNOW |
| `can_continue_under_approved_pb` | **true** | KNOW |
| `system_authorized_actions` | 3 (PF-001, PF-002, DR-003) | KNOW |
| `adam_required_actions` | 0 | KNOW |
| `repair_queue.open_count` | 1 (`DR-003-RECEIPT-STALE`) | KNOW |
| `repair_queue.auto_repair` | **false** | KNOW |
| `phase14.alpha_ready` | true (ledger cert) | KNOW — tension with freshness STALE |
| `builder_mode` | SUPERVISED | KNOW |

---

## Architecture inventory

### Exists (observer / authority)

| Component | Role |
|-----------|------|
| `services/pb-execution-authority.js` | `classifyExecutionAuthority`, `deriveExecutionActions` |
| `services/supervised-autonomy-readiness.js` | Aggregates blockers + splits PB vs ADAM actions |
| `services/oil-self-repair-detector.js` | Detectors, `buildRepairQueue`, audit-run payloads |
| `services/oil-proof-freshness.js` | PF-001..003 freshness rules |
| `GET/POST …/self-repair/*` | Audit, history, repair-queue, oil-misses, audit/run |
| `GET …/supervised-autonomy/readiness` | Readiness card data |
| `POST /api/v1/gemini/proof` | Runtime proof writer (manual trigger today) |
| `POST …/phase14/run-proofs` | Railway-canonical phase receipts |
| CC V2 panels | A2 readiness, G2–G4 self-repair |

### Missing (executor)

| Gap | Impact |
|-----|--------|
| No `POST …/self-repair/execute` (or equivalent) | Authorized repairs never run |
| No repair step orchestrator / state machine | PF-001 → PF-002 → re-audit not chained |
| No `self_repair_execution` receipt type | Cannot prove execution vs detection |
| No useful-work guard for repair scheduler | Would burn tokens if cron added blindly |
| No memory write-back from repair outcomes | Repairs don't improve future detection |
| `LIFEOS_DIRECTED_MODE` / `PAUSE_AUTONOMY` | Would block scheduler until explicitly enabled |

---

## Endpoint matrix

| Endpoint | Method | auto_repair | Executes repair? |
|----------|--------|-------------|------------------|
| `/self-repair/audit` | GET | — | No |
| `/self-repair/audit/run` | POST | false | No — writes audit receipt only |
| `/self-repair/repair-queue` | GET | false | No |
| `/self-repair/oil-misses` | GET | — | No |
| `/supervised-autonomy/readiness` | GET | — | No |
| `/gemini/proof` | POST | — | Yes — but not auto-invoked |
| `/phase14/run-proofs` | POST | — | Yes — but not auto-invoked |

---

## Local vs Railway (operator shell)

| Check | Local audit | Railway |
|-------|-------------|---------|
| `LOCAL_VS_GITHUB_MAIN` | P2 — local `c51d897d` vs main `59b39999` | N/A |
| `LOCAL_PROOF_ONLY` | P1 — proof_store_id mismatch | Railway pool canonical |
| `RAILWAY_STALE_DEPLOY` | Cleared after redeploy | deploy aligned with main |

**Rule:** Execution and proof writes must use Railway-canonical paths (`DATABASE_URL` on server, not local Neon).

---

## Council/OIL brainstorm attempts

| Run | Model | Result |
|-----|-------|--------|
| `POST /builder/task` lifeos-platform | groq_llama | 25 generic ideas, truncated, `//` comment format — **insufficient** |
| `POST /builder/build` lifeos-council-builder | — | 403 safe-scope (docs path blocked on `/build`) |
| `POST /builder/task` + `/execute` lifeos-council-builder | groq_llama | 1561 chars — **insufficient** |

**Receipt:** Final brainstorm document is **Conductor synthesis** grounded in this audit + codebase review. Load-bearing execution design → Phase 1 via Builder `/build` on `services/` paths.

---

## Phase 1 recommended build order (from audit)

1. **`services/self-repair-executor.js`** — step registry: gemini proof → phase14 run-proofs → audit/run → verify freshness
2. **`POST …/self-repair/execute`** — `{ dry_run?, steps?, pb_boundary? }` — calls executor after `classifyExecutionAuthority` gate
3. **`self_repair_execution` receipt** — append-only row in `builder_audit_receipts` or `security_receipts`
4. **Useful-work guard wrapper** — only run when `repair_queue.open_count > 0` OR freshness STALE
5. **CC V2 execute button + dry-run** — shows plan before run; ADAM_REQUIRED halts fail-closed

---

## ADAM_REQUIRED stops (unchanged)

Secrets exposure; destructive DB; money/legal/medical/high-stakes external; autonomy beyond PB; irreversible public launch; intent ambiguity; unrepairable proof chain; outside PB boundary.

Routine gemini proof refresh, phase14 re-cert, receipt writes, and DR-003 repair **are not** Adam stops under §2.16.
