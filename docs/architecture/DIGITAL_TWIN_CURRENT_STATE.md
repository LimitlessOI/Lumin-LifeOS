<!-- SYNOPSIS: Receipted reality map of the Digital-Twin-driven LifeOS vertical slice integration path (Devin black-box mapping, observe-only) -->

# Digital Twin — Current State (Vertical-Slice Integration Map)

**Author office:** Devin (independent integration mapper / black-box tester)
**Mode:** Observe-only. No code changed. Mapped directly against files on disk — **not** from any other agent's self-assessment.
**Date:** 2026-07-10
**Repo tip at mapping:** `main` (see `git log`), Lumin-LifeOS

## Purpose

This is the **Devin part** of the ratified plan: independently map *only* the integration path required to prove the first Digital-Twin-driven vertical slice, so we stop rediscovering the same facts and turn them into institutional memory.

The slice being mapped (founder-selected):

> A user says: "I want to start a business that earns $10,000 per month." The system records the goal as user-stated, loads relevant Twin state, marks unknowns instead of inventing, generates several plausible paths, simulates likely time/money/effort/emotional-cost/risk/opportunity-cost, explains uncertainty, asks whether the user still wants the goal, applies Be–Do–Have, creates one reversible first experiment, records a prediction, honors opt-out, later compares outcome vs prediction, and **proposes — not silently applies — Twin updates.**

The integration path for that slice:

```
conversation entry → Chair → Twin read → Context View activation
  → simulator (alternative futures) → user decision (+ opt-out)
  → experiment ledger (hypothesis → outcome) → Twin proposal/update
```

## Enforcement-status legend (founder-adopted 8th field)

`candidate` · `specified` · `built-unwired` · `partially-enforced` · `known-violation` · `proven-live` · `retired`

A transition to `proven-live` requires a receipt: commit + wiring point + fires-on-breakage result + passes-on-success result + independent observer + timestamp. **Nothing below is marked `proven-live`** — this map is a static/structural read only; live proof is Devin's later black-box run after implementation.

## Truth labels

`KNOW` = verified in the file on disk this session. `THINK` = inference from what was read. `GUESS` = low confidence. Every row cites evidence.

---

## Integration-path reality map

| # | Component (rung) | Verified reality | Evidence (file:path) | Enforcement status | Required action for the slice |
|---|---|---|---|---|---|
| 1 | **Conversation entry → Chair** | KNOW: Real and wired. `runLuminChairTurn(ctx, deps)` is the single front door; imported and called by the `POST /founder-interface/message` handler. Mature intent classification, channels, truth-lockdown, history merge. | `services/lumin-chair-orchestrator.js` (header "WIRED: founder-interface/message"; `runLuminChairTurn` L485); `routes/lifeos-builderos-command-control-routes.js` (import L52, route L1302, call L1654) | `partially-enforced` (front door live; the *goal→twin→simulate→experiment* branch does not exist as a channel yet) | Add a "life-goal / Point-B" turn path that triggers the slice pipeline instead of routing to build/counsel. |
| 2 | **Chair → Twin read** | KNOW: Twin read exists but is **founder-only and fragmented across 3 mechanisms**, no single unified read the Chair calls for an arbitrary user's goal. (a) `core/lifeos-twin-bridge.js` reads `adam_profile`/`adam_decisions` but returns `null` unless `handle === 'adam'`. (b) `services/lifere-twin-store.js` is a real per-user file store (`data/twins/...`) with cross-user guard + PG mirror, but LifeRE-scoped (`@ssot lifere`). (c) `services/lifeos-twin-reaction-simulator.js` reads `lifeos_users.flourishing_prefs`. No formal "mark unknowns instead of inventing" contract — the bridge just returns null. | `core/lifeos-twin-bridge.js` L22-52 (`handle !== 'adam' return null`); `services/lifere-twin-store.js` L48-74; `services/lifeos-twin-reaction-simulator.js` L9-18 | `partially-enforced` | Define ONE Twin-read adapter for the slice that (i) works for any user, (ii) returns typed known/unknown fields, (iii) never fabricates personal facts. This is the "minimum Twin adapter" mission. |
| 3 | **Context View activation** | KNOW: **Not implemented.** `contextView` / `ContextView` / `context view` appears ONLY in raw memory dumps (`•\tLumin-Memory/00_INBOX/raw/...`), and in **zero** `.js`, route, service, or migration. This is a named concept with no code. | grep `context.view|contextView|ContextView` across repo → only 2 hits, both in `•\tLumin-Memory/00_INBOX/raw/` dumps | `candidate` | Smallest real thing: a Context View = a governed, read-scoped projection of Twin state activated for this goal (which fields the simulator may read). Needs a minimal contract + adapter before the slice can honestly claim "Context View activation." |
| 4 | **Simulator (alternative futures)** | KNOW: Partial. Real domain-skill projector exists and is wired: `services/future-self-simulator.js` (`createFutureSimulator`) projects a single skill/level over a horizon with growth math + optional AI narrative, routed via `routes/future-self-simulator-routes.js` (registered `startup/register-runtime-routes.js` L110), backed by table `future_self_projections` (`db/migrations/20260405_future_self_simulator.sql`). BUT: it projects **one domain's skill level**, NOT multi-path alternative futures for a goal with time/money/effort/emotional-cost/risk/opportunity-cost. Also present but NOT fit for slice: `services/lifeos-twin-simulator.js` is a **stub** returning `{reaction:"simulated"}`, and its route `routes/lifeos-twin-simulator-routes.js` is **orphaned** (`registerTwinSimulatorRoutes` is not called anywhere in `startup/`). `services/lifeos-twin-reaction-simulator.js` predicts reaction to a *UI idea*, not goal paths. | `services/future-self-simulator.js` L41-70; `routes/future-self-simulator-routes.js`; `startup/register-runtime-routes.js` L110; `services/lifeos-twin-simulator.js` L4-16 (stub); startup grep for `registerTwinSimulatorRoutes` → **0 matches** (dead route) | `partially-enforced` (skill projector) / `known-violation` (twin-simulator stub + dead route masquerading as a simulator) | Build the alternative-futures generator (several plausible paths + per-path cost/risk/uncertainty). Reuse `future-self-simulator`'s growth/projection math where useful; delete or quarantine the `lifeos-twin-simulator` stub + orphan route so it can't be mistaken for the real thing. |
| 5 | **User decision (+ opt-out)** | KNOW: Partial. Chair already supports decision surfaces: intent-clarify / A-B-C confirm (`chairIntentClarifyResponse`), wisdom clarify (`chairWisdomClarifyResponse`), and outcome capture (`chairOutcomeResponse` → `predicted_option`/`actual_option`/`prediction_hit`). Sovereignty/opt-out is real but scattered: `services/lifeos-money-decision-bridge.js` explicitly "does not block or veto… user remains sovereign" and only opens a second-opinion mirror. No single slice-level "honor rejection / modified goal / opt-out" handler. | `services/lumin-chair-orchestrator.js` L146-172 (intent clarify), L207-234 (wisdom), L450-483 (outcome capture); `services/lifeos-money-decision-bridge.js` L32-36, L124 | `partially-enforced` | Add a slice decision step: user confirms goal / picks a path / modifies / opts out — and opt-out must stop the pipeline and record the choice (no silent continuation). |
| 6 | **Experiment ledger (hypothesis → outcome)** | KNOW: **Strong backbone exists under a different name.** No `experiment_ledger` by that literal name (only in dumps). But `services/cognitive-core-judgment.js` is a real predict→observe→explain-miss→calibrate loop over tables `judgment_decisions`, `judgment_predictions`, `judgment_outcomes`, `judgment_miss_reports`, `judgment_outcome_history`, `judgment_trust_by_domain` — with hard honesty guards: `outcomes_must_not_be_inferred` (throws) and `receipt_verified` claims are downgraded unless a real `judgment_receipt_links` row exists. Supporting: `services/adf-prediction-ledger.js`, `services/cognitive-core-oracle.js` (Oracle calibration), `services/chair-prediction-score-scheduler.js`. | `services/cognitive-core-judgment.js` L35-184 (record decision/prediction/outcome), L107-128 (anti-inference guards), L316-356 (scoreboard); `services/adf-prediction-ledger.js`; `services/cognitive-core-oracle.js` | `partially-enforced` (real prediction/outcome loop; not yet an "experiment" object) | Model "one reversible first experiment" + "record a prediction" ON TOP of cognitive-core-judgment (add an experiment/goal linkage), rather than building a new ledger. This is the highest-reuse rung. |
| 7 | **Twin proposal/update (propose, NOT silently apply)** | KNOW: **Known violation of the founder's explicit requirement.** Every existing Twin write applies immediately: `lifere-twin-store.writeTwin` writes to disk + PG mirror on call; `lifeos-twin-bridge.pushCommitmentOutcome` inserts into `adam_decisions` directly. Closest-to-safe is `syncToUserProfile` (only writes if the field is empty). There is **no** "propose update → user/founder confirms → then apply" gate anywhere. | `services/lifere-twin-store.js` L57-74 (immediate write); `core/lifeos-twin-bridge.js` L89-110 (direct insert), L136-155 (guarded sync) | `known-violation` | Introduce a proposal object (proposed Twin delta + rationale + evidence) that is NOT applied until confirmed. This directly satisfies "propose — not silently apply." |

---

## Slice readiness verdict (KNOW)

- **Live rungs (reuse):** conversation→Chair (1), the prediction/outcome ledger (6), and the skill projector portion of the simulator (4).
- **Founder-only / fragmented (needs a unifying adapter):** Twin read (2).
- **Missing entirely (must be built minimal):** Context View (3), alternative-futures simulator (4, the multi-path part), slice-level decision+opt-out (5).
- **Actively wrong (must fix so it can't lie):** the `lifeos-twin-simulator` stub + its orphaned route (4), and silent Twin writes (7 — violates "propose, not apply").

**Shortest honest path to the slice** (dependency order): (2) minimum any-user Twin-read adapter with typed unknowns → (3) minimal Context View read-scope over that adapter → (4) alternative-futures generator reusing projection math → (5) decision+opt-out step in Chair → (6) experiment+prediction on cognitive-core-judgment → (7) propose-not-apply Twin update gate.

## Explicitly NOT verified here (honesty)

- No live/runtime behavior was exercised — this is structural/static reading only. Enforcement-status `proven-live` is deliberately used **nowhere**.
- Whether the wired routes actually respond in production was not probed in this pass.
- This map does **not** incorporate any other agent's (Claude/Opus) self-assessment, by design (black-box independence). After implementation, Devin runs black-box scenarios against the running slice before accepting any `proven-live` transition.

## Handoff note to the other offices

- **Implementation Conductor (Claude Code):** rungs 2→7 above are the bounded factory missions, in that order. Rung 6 is highest-reuse; rung 7 is the founder's explicit "propose not apply" requirement; the SO-003 correction remains the recommended first mission because it is already specified and immediately testable.
- **Architect (Opus):** rungs 2, 3, 5, 7 are the ones needing the minimum contracts (Twin state item format, Context View read permissions, decision/opt-out behavior, Twin-proposal format).
