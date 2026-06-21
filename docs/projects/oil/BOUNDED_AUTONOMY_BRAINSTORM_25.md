<!-- SYNOPSIS: Bounded Autonomy Brainstorm — 25 Ideas -->

# Bounded Autonomy Brainstorm — 25 Ideas

> **Phase 0** — Council/OIL brainstorm before bounded autonomous execution build  
> **Generated:** 2026-05-24  
> **Authority:** SSOT §2.16 SYSTEM_AUTHORIZED_UNDER_PB  
> **Basis:** `PHASE0_BOUNDED_AUTONOMY_AUDIT.md` + live Railway probes  
> **Note:** Two Council API passes (groq_llama) returned generic/truncated output. This document is **Conductor synthesis** from audit + codebase — Phase 1 implementation via Builder on `services/` paths.

---

## Category 1 — Self-repair execution & orchestration

### Idea 01 — Self-Repair Executor Service
- **Category:** Self-repair execution & orchestration
- **Problem:** `deriveExecutionActions()` lists authorized work; nothing runs it (`auto_repair: false` everywhere).
- **Proposal:** New `services/self-repair-executor.js` with `runAuthorizedRepairCycle(pool, { dryRun, steps })` — ordered step registry keyed by PF/DR codes.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** `POST /self-repair/execute?dry_run=true` returns step plan; live run writes execution receipt.
- **Priority:** P0
- **Effort:** M

### Idea 02 — POST /self-repair/execute Route
- **Category:** Self-repair execution & orchestration
- **Problem:** No HTTP entry point for bounded execution inside PB.
- **Proposal:** Add to `routes/lifeos-command-center-routes.js`: `POST /api/v1/lifeos/command-center/self-repair/execute` — body `{ dry_run, step_filter?, triggered_by }`; fail-closed if any step maps to ADAM_REQUIRED.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** Route returns `{ executed_steps[], skipped_adam_required[], receipt_id }`.
- **Priority:** P0
- **Effort:** S

### Idea 03 — Repair Step State Machine
- **Category:** Self-repair execution & orchestration
- **Problem:** PF-001 must precede PF-002; failures mid-chain leave ambiguous state.
- **Proposal:** Explicit states: `PLANNED → RUNNING → VERIFIED | FAILED | HALTED`; persist in execution receipt payload; halt on first honest failure (§2.6).
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** Failed gemini proof → chain stops; receipt shows `halted_at: PF-001`, no fake phase14 pass.
- **Priority:** P0
- **Effort:** M

### Idea 04 — Dry-Run Default in CC V2
- **Category:** Self-repair execution & orchestration
- **Problem:** Operators cannot preview autonomous chain before first live run.
- **Proposal:** CC V2 Section A2 button "Plan repair cycle" → `POST /execute { dry_run: true }`; separate "Execute authorized" requires no Adam when all steps PB-authorized.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** UI shows step list + authority pills before execution.
- **Priority:** P1
- **Effort:** S

### Idea 05 — Fail-Closed ADAM_REQUIRED Pre-Flight Gate
- **Category:** Self-repair execution & orchestration
- **Problem:** Executor could run destructive or out-of-scope steps without gate.
- **Proposal:** Before each step, `classifyExecutionAuthority()`; if ADAM_REQUIRED → halt entire cycle, write halt receipt, surface in `adam_required_actions` only.
- **Authority:** ADAM_REQUIRED (when step triggers true stop)
- **Proof of done:** Simulated `GITHUB_TOKEN_MISSING` blocker → execute returns 409 + no side effects.
- **Priority:** P0
- **Effort:** S

---

## Category 2 — Proof chain & freshness

### Idea 06 — PF-001 Gemini Proof Auto-Step
- **Category:** Proof chain & freshness
- **Problem:** DR-003 / PF-001 STALE — receipt SHA `380d84dd` ≠ deploy `762f90c9`; manual POST only.
- **Proposal:** Executor step 1: internal `POST /api/v1/gemini/proof` (same pool, requireKey bypass via service call not HTTP loopback if possible).
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** New gemini receipt with `commit_sha === railway_deploy_sha`.
- **Priority:** P0
- **Effort:** S

### Idea 07 — PF-002 Phase14 Run-Proofs Auto-Step
- **Category:** Proof chain & freshness
- **Problem:** Phase14 freshness STALE despite ledger alpha_ready — proofs not re-run after deploy.
- **Proposal:** Executor step 2: invoke phase14 run-proofs handler after PF-001 success; then optional certify if still NOT_ALPHA_READY.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** `evaluateProofFreshnessFromPool` → `phase14.status !== STALE`.
- **Priority:** P0
- **Effort:** M

### Idea 08 — Post-Execute Re-Audit Step (PF-003)
- **Category:** Proof chain & freshness
- **Problem:** Execution without verification repeats fake-green pattern.
- **Proposal:** Final step: `POST /self-repair/audit/run` + compare `proof_freshness.overall === CURRENT`.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** Audit receipt shows `repairNeeded: false` after successful cycle.
- **Priority:** P0
- **Effort:** S

### Idea 09 — Freshness-Gated ready_for_supervised
- **Category:** Proof chain & freshness
- **Problem:** `phase14.alpha_ready` true while freshness STALE confuses operators.
- **Proposal:** Readiness report adds `freshness_blocks_supervised: true` when ledger and freshness disagree; CC shows both honestly.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** CC A2 card shows "Ledger ALPHA_READY / Freshness STALE" dual label.
- **Priority:** P1
- **Effort:** S

### Idea 10 — Deploy-Triggered Proof Refresh Hook
- **Category:** Proof chain & freshness
- **Problem:** Every redeploy invalidates gemini receipt until manual refresh.
- **Proposal:** After Railway deploy detect (`deploy_sha` change), enqueue one authorized repair cycle via useful-work guard (not on every health poll).
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** Redeploy → within 15m gemini receipt matches new SHA without Adam step.
- **Priority:** P1
- **Effort:** M

---

## Category 3 — Repair queue & OIL miss learning

### Idea 11 — Queue-Driven Step Selection
- **Category:** Repair queue & OIL miss learning
- **Problem:** Repair queue and executor are disconnected.
- **Proposal:** `runAuthorizedRepairCycle` reads `buildRepairQueue()` OPEN items; maps `detectRule` → executor step (DR-003 → PF-001).
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** DR-003 OPEN → execute plan includes gemini proof step.
- **Priority:** P0
- **Effort:** S

### Idea 12 — Auto-Close Queue Items on Verify
- **Category:** Repair queue & OIL miss learning
- **Problem:** OPEN items stay open after successful repair.
- **Proposal:** After re-audit VERIFIED, write `self_repair_execution` receipt linking `issueId`; queue status derives REPAIRING→VERIFIED from receipt cross-check (already partial — extend for execution receipts).
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** DR-003 → VERIFIED after receipt SHA match without manual update.
- **Priority:** P1
- **Effort:** S

### Idea 13 — OIL Miss → Detector Registry Feedback
- **Category:** Repair queue & OIL miss learning
- **Problem:** `KNOWN_OIL_MISSED_ISSUES` is static; same miss classes repeat.
- **Proposal:** On `oil_missed_issue` receipt, append rule candidate to `REPAIR_QUEUE_REGISTRY` via config migration or `config/oil-repair-registry.js` Builder slice.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB (inside PB); ADAM_REQUIRED if registry change expands scope beyond PB
- **Proof of done:** New miss class appears in repair-queue within one deploy after receipt.
- **Priority:** P1
- **Effort:** M

### Idea 14 — Miss Recurrence Counter
- **Category:** Repair queue & OIL miss learning
- **Problem:** No signal when OIL misses same finding repeatedly.
- **Proposal:** `summarizeOilMisses()` adds `recurrence_count` per `finding_id`; P0 if ≥3 in 7d.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** GET `/oil-misses` shows recurrence; readiness escalates to P0 warning.
- **Priority:** P2
- **Effort:** S

### Idea 15 — Execution ↔ Miss Linkage Receipt
- **Category:** Repair queue & OIL miss learning
- **Problem:** Cannot trace which auto-execution resolved which miss.
- **Proposal:** Execution receipt payload includes `resolved_finding_ids[]`, `resolved_issue_ids[]`.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** Receipt #N references OIL-SEC-FIND-20260523-003 with `status: repaired`.
- **Priority:** P1
- **Effort:** S

---

## Category 4 — Memory / episodic learning from repairs

### Idea 16 — Repair Episodic Event Write
- **Category:** Memory / episodic learning from repairs
- **Problem:** Repairs leave no memory trace for Lumin/Conductor cold start.
- **Proposal:** After each execution cycle, write episodic event `{ type: self_repair_execution, steps, outcome, deploy_sha }` via memory service API (or `builder_audit_receipts` until memory wired).
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** `GET /memory/...` or receipt history shows last 5 repair cycles.
- **Priority:** P1
- **Effort:** M

### Idea 17 — Failure-Pattern Memory (FPM) for Repair Halts
- **Category:** Memory / episodic learning from repairs
- **Problem:** Same halt reasons (FK violation, check constraint) repeat in phase14 run-proofs.
- **Proposal:** On HALTED execution, store `{ failure_family, step, detail }` in FPM table/jsonl; executor consults before retry (skip known-bad paths).
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** Second identical failure → executor suggests different step or HALT with FPM citation.
- **Priority:** P1
- **Effort:** M

### Idea 18 — INVARIANT Candidate from Recurring STALE Proof
- **Category:** Memory / episodic learning from repairs
- **Problem:** STALE proof after every deploy is recurring; not captured as invariant.
- **Proposal:** If STALE detected ≥5 times in 30d, propose memory invariant: "After deploy, gemini proof refresh required before supervised ready."
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** Invariant proposal row in memory with `context_required: deploy_sha_change`.
- **Priority:** P2
- **Effort:** M

### Idea 19 — Repair Playbook Prompt Injection
- **Category:** Memory / episodic learning from repairs
- **Problem:** Builder cold agents re-discover repair order each session.
- **Proposal:** Inject last successful `self_repair_execution` receipt summary into `prompts/lifeos-council-builder.md` context via dynamic `GET /builder/next-task` snippet.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** `/builder/next-task` includes last repair cycle outcome.
- **Priority:** P2
- **Effort:** S

### Idea 20 — Conductor Handoff Auto-Update from Execution
- **Category:** Memory / episodic learning from repairs
- **Problem:** CONTINUITY_LOG handoff stale after autonomous repair.
- **Proposal:** Execution receipt triggers optional `appendContinuityPointer()` — one-line TSOS machine entry, not full doc rewrite.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** `data/self-repair-execution-log.jsonl` append-only line per cycle.
- **Priority:** P2
- **Effort:** S

---

## Category 5 — TSOS token efficiency & useful-work guards

### Idea 21 — Useful-Work Guard for Repair Scheduler
- **Category:** TSOS token efficiency & useful-work guards
- **Problem:** Scheduled repair cron would burn tokens when nothing STALE.
- **Proposal:** `createUsefulWorkGuard({ workCheck: repair_queue.open_count + freshness.stale })` — skip if 0 open and CURRENT.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** Guard logs `skipped — nothing to do` when proof CURRENT.
- **Priority:** P0
- **Effort:** S

### Idea 22 — No Council Tokens for Deterministic Steps
- **Category:** TSOS token efficiency & useful-work guards
- **Problem:** Gemini proof + run-proofs are HTTP/DB operations — no LLM needed.
- **Proposal:** Executor steps typed `deterministic | council`; only `council` steps call `callCouncilMember`. Proof refresh = deterministic.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** Full repair cycle completes with zero council tokens.
- **Priority:** P0
- **Effort:** S

### Idea 23 — Repair Cycle Budget Cap
- **Category:** TSOS token efficiency & useful-work guards
- **Problem:** Runaway retry loops could burn tokens/API quota.
- **Proposal:** Env `SELF_REPAIR_MAX_STEPS=5`, `SELF_REPAIR_MAX_CYCLES_PER_DAY=3`; executor enforces before run.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** 4th cycle same day → 429 + receipt `budget_exhausted`.
- **Priority:** P1
- **Effort:** S

### Idea 24 — Directed-Mode Override for Repair Only
- **Category:** TSOS token efficiency & useful-work guards
- **Problem:** `LIFEOS_DIRECTED_MODE=true` blocks all autonomy including PB-authorized self-repair.
- **Proposal:** Env `SELF_REPAIR_OVERRIDE_DIRECTED_MODE=true` when `can_continue_under_approved_pb` — narrow exception for proof refresh only.
- **Authority:** ADAM_REQUIRED if scope expands beyond proof/phase14/receipt repair
- **Proof of done:** Directed mode on + override on → PF-001 executes; builder queue still blocked.
- **Priority:** P1
- **Effort:** S

### Idea 25 — TSOS Machine-Channel Execution Receipts
- **Category:** TSOS token efficiency & useful-work guards
- **Problem:** Human-readable logs burn operator tokens in handoff.
- **Proposal:** All executor output via `[TSOS-MACHINE]` JSONL (`data/self-repair-execution-log.jsonl`) — Conductor reads file, not chat prose.
- **Authority:** SYSTEM_AUTHORIZED_UNDER_PB
- **Proof of done:** One JSONL line per step with `STATE`, `VERB`, `NEXT`.
- **Priority:** P1
- **Effort:** S

---

## Phase 1 build order (recommended)

1. **Idea 01 + 02 + 05** — executor service + route + ADAM gate (P0)
2. **Idea 06 + 07 + 08** — PF-001 → PF-002 → re-audit chain (P0) — clears current STALE
3. **Idea 21 + 22** — useful-work guard + deterministic-only first slice (P0)
4. **Idea 11 + 12** — repair queue integration + auto-close (P1)
5. **Idea 04** — CC V2 dry-run + execute UX (P1)

---

## First executable slice (immediate)

Run under SYSTEM_AUTHORIZED_UNDER_PB without Adam per-step approval:

```
1. POST /api/v1/gemini/proof
2. POST /api/v1/lifeos/command-center/phase14/run-proofs
3. POST /api/v1/lifeos/command-center/self-repair/audit/run
4. GET /supervised-autonomy/readiness → verify freshness CURRENT
```

Today these steps exist individually but are **not chained**. Phase 1 wires them.
