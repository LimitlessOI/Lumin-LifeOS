<!-- SYNOPSIS: Priority 5 — the decision/prediction/outcome/calibration ledger Wisdom must eventually read from -->

# Decision → Outcome Ledger v1

**Status:** Infrastructure only, live. **Date:** 2026-08-04. **Owner:** LifeOS / Chair.

## What this is, and what it deliberately is not

The founder's exact required sequence for Wisdom:

```
Decision record → prediction → action → outcome → comparison → calibration → Wisdom
```

with the explicit warning: *"Wisdom without real outcome history will become another intelligent-sounding but ungrounded service."*

This ships the ledger — `services/chair-decision-ledger.js`, table `decision_outcome_ledger` — **not** Wisdom itself. Wisdom (the analysis/pattern-detection layer that reads accumulated history and produces insight) genuinely cannot be built honestly tonight: it needs real accumulated history, and manufacturing fake outcome records to make it "look done" is exactly the theater the founder is guarding against. That part closes itself out automatically as the system runs for real over time, not through more code written in one sitting.

## What was audited before building

No existing system matches this shape:

- `services/calibration-ledger.js` — in-memory only (`new Map()`), wiped on every restart/deploy. The same non-persistence gap the earlier independent constitutional audit already flagged (findings F-04/F-05).
- `services/outcome-tracker.js` — DB-backed and live, but tracks **product-feature ROI** (revenue/conversion/time-saved, keyed to the `ideas` table) — a real, different, unrelated purpose.
- `services/chair-solomon-calibration.js`, `services/solomon-wisdom-lab.js` — completely unreachable orphans, zero real importers.

## Design

Four functions, one self-bootstrapping table, no AI call anywhere in the ledger itself (recording and retrieval are deterministic — any AI-based *judgment* of whether a prediction was correct would itself be an ungrounded claim, so the caller states `outcome_match` honestly, not the ledger):

- `recordDecision(pool, {userId, source, decisionText, predictionText, confidenceBefore})` — opens a record.
- `recordOutcome(pool, decisionId, {actualOutcomeText, outcomeMatch, confidenceAfter})` — closes it. `outcomeMatch` is `'correct' | 'incorrect' | 'partial'`, stated by the caller.
- `getCalibrationSummary(pool, {userId, minSampleSize=20})` — aggregates, but **explicitly refuses to present `accuracy_rate` as meaningful below the sample floor**, returning an honest `honest_note` instead. This is the direct, coded guard against the "intelligent-sounding but ungrounded" failure mode — not a comment, an actual returned field the caller must see.

## Seed data — real, not fabricated

Six real decisions from tonight's own session were recorded and resolved as the ledger's first entries — genuine predictions made during tonight's work, compared against their actual, live-verified outcomes (not invented for this exercise):

| Decision | Predicted | Actual | Match |
|---|---|---|---|
| Repoint the commitment tracker to the canonical table | Would alone fix dashboard parity | Live re-test still failed — root cause was deeper (front-door tool gap) | incorrect |
| Widen the `life_admin` gate to channel `chair` | Would fix routing and close the loop | Direct HTTP test proved the fix landed in dead code (front door returns earlier) | incorrect |
| Wire capture into the real front-door tool + prompt | Would make the write path work, might not fully close the loop | Write worked, dashboard saw it for the first time all session; query/windowing bugs remained | partial |
| Add future-date floors + widen the dashboard window | Closes remaining Priority 1 gaps | Live E2E: `ok: true`, all 7 criteria passed | correct |
| Ship the crisis gate as mandatory, not LLM-optional | Fixed message fires on crisis language, normal chat unaffected | Confirmed exactly as predicted, live | correct |
| Return immediately after a successful agent action | Stops the duplicate-write bug | Confirmed live: exactly 1 row instead of 3 | correct |

Result: 6 resolved, 3 correct, `accuracy_rate: 0.5`, and `sufficient_for_wisdom: false` — the function itself refuses to call 6 samples meaningful, which is the correct, honest behavior at N=6, not a bug.

## Honesty note on verification

Like the crisis-gate receipt earlier tonight, this pass verifies the ledger's **logic** — table creation, insert, update, and the honest-insufficient-data guard — against this machine's local database connection. Per the local/production DB split discovered during Priority 1, this is not an independent re-confirmation that these exact 6 rows exist in production's literal database. The code ships to production regardless (the table is self-bootstrapping and will create itself the first time any real caller uses it there); the six seed rows are a demonstration that the mechanism is correct, not a claim about production's current row count.

## What happens next (not now)

Real Wisdom — the service that reads `decision_outcome_ledger`, `calibration_corrections` (from Priority 1's session), and any future prediction sources, and produces genuine pattern insight — should only be built once `total_resolved` crosses a real sample floor from actual system usage, not from more seeded examples. This document, and `getCalibrationSummary`'s `sufficient_for_wisdom` field, are the concrete trigger for when that's true.

@ssot docs/products/lifeos/PRODUCT_HOME.md
