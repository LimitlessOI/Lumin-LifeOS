<!-- SYNOPSIS: Phase 5/6/9 behavior gaps for the Taloa architecture (2026-08-03). Audit deliverable. -->

# Constitutional Behavior Gaps (Phases 5/6/9) — 2026-08-03

Gaps between claimed behavior and demonstrated behavior. Full detail in the findings JSON.

## G1 — Separation of powers is a unit test, not a live rule (F-06, P1)
`solomon-withheld-recommendation.js` correctly withholds Solomon's recommendation until a Chair preliminary decision is recorded — the one passing adversarial test. But no live Chair/Solomon decision path calls it. The founder's specifically-emphasized separation of powers is enforced nowhere a real decision is made. It is also an in-process object flag, not procedural/cryptographic protection across agents or processes.

## G2 — No calibration loop closes against reality (F-04, F-05, P1)
`calibration-ledger.js` and `office-trust-ledger.js` store state in module-level `new Map()`s. Nothing persists; nothing survives restart; nothing in runtime calls `recordPrediction`/`recordOutcome`. §2.0L "Prediction → Reality → Calibration" has no measurable loop. Adversarial test "persists via DB or file" FAILS.

## G3 — Observability measures document text, not behavior (F-07, P2)
`PRINCIPLE_RUNTIME_MAP.json` (14 entries) uses `pass_criteria` like "framework contains the mission phrase" with `required_service: null`. The acceptance verifier checks file existence → `TECHNICAL_PASS`. The system cannot answer "which constitutional principle governed this action / what evidence / what prediction / what outcome" for any live action, because no live action is instrumented against a principle.

## G4 — Confidence Vectors have no provenance enforcement + are duplicated (F-04, F-09, P2)
Two near-duplicate engines (`confidence-vector.js`, `confidence-vectors.js`); neither is on a runtime path. There is no runtime point where a confidence score without evidence provenance is rejected. The only mounted "confidence" route is an unrelated child-wellness feature.

## G5 — Entity Twin Framework not generalized (F-10, P2)
No shared entity-twin core exists; twins are bespoke per domain (`lifere-*-twin`, `creatorPersonaTwin`, `lifeos-twin-simulator`). `institutional-constellation.js` is a self-contained in-memory factory, not an instance of a reusable framework.

## G6 — Risk/safety: no verified trajectory model or least-invasive-response selection (F-03, P2)
`readiness-engine.js` is runtime=0. No runtime path was found that takes a risk signal and selects a least-invasive permitted response over automatic escalation. (Not tested live to avoid triggering real safety actions, per audit restrictions.)

## Adversarial test ledger
`tests/audit-taloa-runtime-reachability.test.mjs` — 13 tests, **1 pass / 12 fail**:
- FAIL ×11: each core engine has no runtime importer.
- FAIL ×1: calibration ledger is not durable.
- PASS ×1: Solomon withheld-recommendation library logic is correct.

**Not run (time-boxed, noted per audit discipline):** live ship-block on a real constitutional violation; two-twin shared-framework proof; confidence-without-provenance rejection at a runtime boundary; risk least-invasive-response selection. These require driving the machine ship path / building fixtures and are recommended as the next audit increment.

## G7 — Archive authorization outcome (no destructive action taken)
Per founder authorization to archive files that are BOTH improperly-authoritative AND redundant, candidates were vetted; **none qualified** (see `HIDDEN_DEPENDENCY_AUDIT_2026-08-03.md` for per-file reasoning). No `git mv` was performed. The framework-fork file is improper-authority but load-bearing (not redundant) → recorded as F-13 instead. Separately, the founder-named archive path `docs/constitution/archive/` is gitignored (F-16) — the tracked convention `docs/history/constitution/` was used to seed the archive index.
