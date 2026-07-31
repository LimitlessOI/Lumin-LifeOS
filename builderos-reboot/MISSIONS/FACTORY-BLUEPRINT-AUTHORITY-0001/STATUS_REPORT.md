<!-- SYNOPSIS: FACTORY-BLUEPRINT-AUTHORITY-0001 status report — what is done, what is live, and what remains. -->

# FACTORY-BLUEPRINT-AUTHORITY-0001 — Status Report

**Date:** 2026-07-23  
**Local `main` commit:** `84524b91b`  
**Production deploy SHA:** `f1087a19afe25faaf58bc461afb3beebbc86df05` (deploy parity verified)  
**Primary green-light gate:** `npm run builder:preflight` PASS (418/418)  

## What is finished and live

| Deliverable | Location | Proof |
|-------------|----------|-------|
| Phase 1 Builder Readiness Audit | `BUILDER_READINESS_AUDIT.md` | Verdict `NOT READY TO MANUFACTURE`; 12 ambiguities, 7 founder decisions, 7 amendments recorded. |
| File-placement authority gate (library) | `scripts/lib/file-placement-gate.mjs` | New protected source files blocked unless `@ssot` points to a registered `docs/products/<id>/PRODUCT_HOME.md` or approved shared authority. |
| File-placement pre-commit verifier | `scripts/verify-file-placement.mjs` | Wired into `githooks/pre-commit` as step 2b+. |
| Hard block in BuilderOS execute-batch | `routes/lifeos-council-builder-routes.js#commitOrMirrorFiles` | Calls `evaluateFilePlacement` and refuses commit with `FILE_PLACEMENT_VIOLATION` (HTTP 422). |
| Step-status gate in truth-ladder | `services/truth-ladder.js#exactChangeClaim` | New `allow_terminal_steps` parameter; shipping paths pass `false`. |
| Step-status gate in ship-queue | `routes/factory-mount-routes.js` `/factory/ship-queue` | `exactChangeClaim(..., allow_terminal_steps: false)`. |
| Step-status gate in reverse-step | `routes/factory-mount-routes.js` `/factory/reverse-step` | `exactChangeClaim(..., allow_terminal_steps: true)`. |
| Step-status gate in governed runner | `services/governed-shipping-runner.js#runGovernedShippingQueue` | `exactChangeClaim(..., allow_terminal_steps: false)`. |
| Step-status gate in direct execute-step | `factory-staging/factory-core/builder/run-step.js#dispatchExecuteStep` | Blocks `blocked`, `skipped`, `cancelled`, `done`, and `human_hold` steps at factory entry. |
| Product home Change Receipts | `docs/products/builderos/PRODUCT_HOME.md` and `docs/products/lifeos/PRODUCT_HOME.md` | Updated `Last Updated` and `Change Receipts` rows. |
| Continuity log | `docs/CONTINUITY_LOG.md` | One-paragraph summary added at top. |
| Pre-commit hook executable bit restored | `githooks/pre-commit` | Mode `100644` → `100755` in commit `84524b91b`. |

## Test evidence

```
node --test tests/truth-ladder.test.js tests/product-build-orchestrator.test.js tests/run-step-overwrite-guard.test.js
# 52/52 PASS

npm run builder:preflight
# 418/418 PASS
```

`lifeos:bp-priority:verify` still exits 1 because of migration preflight warnings (see below); `builder:preflight` is the primary green-light gate and passes.

## What is NOT finished

| Item | Why it matters | Current state |
|------|----------------|---------------|
| Migration preflight (`CREATE_TABLE_COLLISION_RISK` ×13, `ALTER_ADD_COLUMN_MISSING_IF_NOT_EXISTS` ×10) | The two green-light gates disagree; `lifeos:bp-priority:verify` fails while `builder:preflight` passes. | Listed in `BUILDER_READINESS_AUDIT.md` AMB-007. Needs decision on whether to consolidate duplicate `CREATE TABLE` migrations or grandfather them. |
| SSOT/product-home debt | 570 source files in `routes/`, `services/`, `core/`, `startup/` still missing `@ssot` tags. | New files are now blocked, but legacy files are grandfathered. A cleanup pass is required to reach zero drift. |
| SMOS revenue loop | Cannot close real payment/entitlement/delivery loop without credentials. | `scripts/verify-smos-email-provider.mjs` and `scripts/verify-smos-live-charge.mjs` are ready; blocked on Railway env `EMAIL_FROM` + `RESEND_API_KEY`/SMTP or `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`. |
| Receipt Auditor / Reality Replay Agent | The missing independent role that re-runs receipted commands in a clean environment to prove pass/fail claims are real. | Not built. Recommended next mini blueprint. |
| SENTRY reality station tie-in to blueprint requirements | Phase 5 of the mini blueprint. | Partially exists; not yet wired to read `BLUEPRINT.json`/`BUILD_QUEUE.json` requirement IDs. |
| Continuous Wisdom learning loop | Phase 7 of the mini blueprint. | `wisdom-decision-drift.mjs` exists but not yet auto-rewriting the next blueprint. |

## Recommended next mini blueprint

**Receipt Auditor / Reality Replay Agent** — mechanically prove that a `PASS` or `DONE` receipt is reproducible:
1. Read receipt (`OBJECTIVE_VERDICT.json`, `MISSION_*_HANDOFF.json`, `PASS` receipts).
2. Extract `commit_sha` and the test/verify commands it claims passed.
3. Clone/check out a clean worktree at that commit.
4. Re-run the commands.
5. Compare output to the receipt; fail if mismatch.
6. Write `REALITY_AUDIT.json` and fail-closed seal/unseal the related blueprint step.

This closes the "AI making up receipts" gap the founder identified.
