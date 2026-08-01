<!-- SYNOPSIS: Current-state audit for FACTORY-REPAIR-AND-AUTONOMY-0001. -->

# FACTORY-REPAIR-AND-AUTONOMY-0001 — Current State Audit

**Audit date:** 2026-08-02
**Auditor:** Devin
**Source:** `docs/reports/AUDIT_REPAIR_AND_PROTOCOLS.md` and live queue inspection
**Production SHA at audit time:** `2215f4823c63`

---

## 1. Overnight verdict

The system stopped. `data/never-stop-product-factory-log.jsonl` last real product-build entry is 2026-08-01T16:18Z; after that only `smos_intake_expansion` filler cycles ran. `bp-priority-never-stop` returns `ok: true` with no actionable steps because the queue is gated by missing artifacts and there is no daemon to wake the loop.

**Root cause:** `bp-priority:once` is a single-shot CLI invocation, not a background scheduler. When the Devin/AI session ends, nothing calls it.

## 2. Repair-system inventory

| Component | What it does | Gap |
|---|---|---|
| `scripts/self-heal-build-queue.mjs` | Re-evaluates BUILD_QUEUE statuses, flips false-done back to pending, marks already-satisfied steps done | Does not generate the missing code/fix that clears the step |
| `scripts/audit-false-done-steps.mjs` | Reports HARD/SOFT artifact-proof failures | Diagnostic only |
| `services/product-build-orchestrator.js#evaluateStepExpectations` | Artifact-proof gate (file_contains, expected_exports, route) | Called but has no repair side effect |
| `factory-staging/scripts/factory-self-check.mjs` | Syntax/import checks | Factory-staging only |
| `scripts/oil-self-repair-audit.mjs` | OIL/cert proof audit | Not verified against live production |

**Verdict:** BuilderOS has strong detection and weak actuation. The conductor still has to wake up, diagnose the mismatch, hand-edit files, and re-push.

## 3. Queue state

- 11 pending `BUILD_QUEUE` steps remain across 7 lower-priority products.
- Most are blocked by missing `services/` or `routes()` modules or skipped `db/migrations/` steps.
- All paid/free AI providers are rate-limit/credit exhausted, so model codegen lanes are dry.
- Site Builder / SMOS revenue still parked on missing Railway env vars (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `POSTMARK_SERVER_TOKEN`, `EMAIL_FROM`, `SITE_BASE_URL`).

## 4. Constitutional protocols

### Installed and tested

- Constitutional Decision Engine (`classifyMission` / `createReasoningPlan`) in `factory-staging/factory-core/builder/reasoning-plan.mjs`.
- Reversibility classification A/B/C in `classifyMission`.
- Confidence propagation and limiting-factor reporting in `propagateOverallConfidence`.
- Unknowns, assumptions, risks, evidence needed, and reality measures fields in `createReasoningPlan`.
- Runtime wiring through `services/chair-lumin-unified.js#runCognitiveReasoning`.
- Test coverage in `tests/reasoning-plan.test.mjs`.

### Not yet runtime

- Knowledge/Judgment split service.
- Goal decomposition service.
- Cognitive-spine health metrics collector.
- Asset-evolution governance service.
- Reality hierarchy reconciler.
- Founder cognitive-load optimizer.

These are documented in `builderos-reboot/MISSIONS/FACTORY-MASTER-A-TO-Z-0001/TEN_OUT_OF_TEN_DEFINITION.md` but exist as architecture/commentary, not services with tests.

## 5. Competitive gaps

- **Raw coding benchmarks:** Devin/OpenAI Codex lead on SWE-bench style tasks.
- **IDE integration:** Cursor/Cody are inside the editor; BuilderOS is server-overlay/CLI.
- **Empirical proof:** no public benchmark harness yet.
- **Model routing ROI:** ledger exists but not proven to save money vs a single top-tier model.
