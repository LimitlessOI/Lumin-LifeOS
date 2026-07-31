<!-- SYNOPSIS: BuilderOS readiness audit for FACTORY-PATH-TO-TEN-0001 -->

# BuilderOS Readiness Audit — FACTORY-PATH-TO-TEN-0001

**Date:** 2026-07-23  
**Current BuilderOS rating:** 5/10  
**Target:** 10/10 — self-correcting, revenue-proving cognitive manufacturing system

## What works now

- `npm run builder:preflight` passes (429 tests green, deploy parity verified).
- `npm run lifeos:bp-priority:verify` passes (migration preflight green, 26 BP guardrails green).
- `node scripts/ssot-check.js --all` exits 0 with 781 tagged / 589 missing (report-only baseline).
- `node scripts/audit-false-done-steps.mjs --ci` exits 0 (0 HARD regressions, 119 SOFT content-drift findings grandfathered).
- M2PT-005 is live: `services/deployment-service.js#commitToGitHub` and `commitManyToGitHub` now call `assertFilePlacementAndBlueprintAuthority`, blocking new `services/`/`routes/`/`core/`/`startup/`/`middleware/` files without a valid `@ssot` to a BP-registered product home.
- Production deploy parity confirmed at `1749cf9eefe8c93863ca254132522a7fb452f94b`.

## Hard blockers to 10/10

1. **Receipt Auditor / Reality Replay Agent (M2PT-006)** — no way to re-run a receipted acceptance command at a pinned SHA with separation of duties.
2. **SENTRY operational (M2PT-007)** — Layer A structural assertions and Layer B real-browser walkthroughs are not fully wired and fail-closed for every `done` step.
3. **Chair/Lens/Model/Execution pipeline (M2PT-008)** — `services/cognitive-chair.mjs` and `data/lenses/*.json` exist but are not invoked by the factory `execute-step` path.
4. **Model-cost ROI ledger (M2PT-009)** and **Wisdom learning loop (M2PT-010)** — no per-call cost/outcome ledger, no feedback from SENTRY/receipts into lens/model trust.
5. **Revenue reality (M2PT-011/012)** — SMOS checkout scaffold is live, but a real Stripe charge/webhook proof is pending founder/env unlock.
6. **Full idea→blueprint→code→revenue cycle (M2PT-013/014)** — not yet demonstrated end-to-end without human rescue.

## Metrics

| Gate | Status | Count |
|------|--------|-------|
| `builder:preflight` | PASS | 429/429 |
| `lifeos:bp-priority:verify` | PASS | 0 migration failures |
| `@ssot` tag coverage | baseline | 781 tagged / 589 missing |
| false-done audit | baseline | 0 HARD / 119 SOFT |
| never-stop gate enforcement | PASS | 5/5 regression tests |
| deploy parity | PASS | `1749cf9ee` |

## Ambiguity register

- `lifeos:bp-priority:verify` is green because migration collisions are grandfathered; new migrations must remain idempotent.
- SSOT debt is accepted as a grandfathered baseline for Phase 1; new files must be tagged.
- SOFT false-done findings are stale assertion drift, not broken files, and are waived pending rebuild.

## Recommended amendments

- Reuse `services/cognitive-core-oracle.js` generic calibration math (`brierScore`, `decideGate`, `verdictFromReceipt`) for lens/model trust; do not merge the user-specific judgment storage.
- Keep `PAUSE_AUTONOMY=1` / `FOUNDER_STOP.json` active until M2PT-014 ratification.
