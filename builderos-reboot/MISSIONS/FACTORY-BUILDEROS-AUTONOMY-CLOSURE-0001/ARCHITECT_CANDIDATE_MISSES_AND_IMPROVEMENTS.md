<!-- SYNOPSIS: Architect candidate misses and improvements -->

# Architect Candidate Misses And Improvements

Status: ARCHITECT_CANDIDATE_ONLY  
Mission: FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001

## Strongest Improvements

1. Use a shared completion semantics helper. The biggest current bug is duplicated local interpretation of TECHNICAL_PASS/PASS. Scheduler, runner, readiness, Point B navigator, and guardrails should all call the same helper.

2. Treat transport proof as its own gate. A build can be locally committed, pushed, deployed, and behavior-verified at different times. The system needs explicit states instead of one PASS word.

3. Make founder-specific failures promotable fixtures. The Twisted Tea calorie prompt is the pattern: if Adam finds a real UI-path miss, that exact flow becomes acceptance, not anecdote.

4. Convert improvement proposals into enforceable deltas. The current loop can identify P0s but should block healthy-idle or attach a BP/acceptance delta rather than remain advisory.

5. Bind receipt freshness to deploy SHA and corpus/source hashes. Mtime-based fresh receipt reuse is not strong enough for live truth.

## Underweighted Current Risks

- `PRODUCT_READINESS_REPORT.json` was stale relative to `PRODUCT_REGISTRY.json`; generated reports need source hashes and stale markers.
- `builderos:alpha:confirm` appears to reference a missing script. Active proof aliases need a missing-target verifier.
- Existing live deploy tools are strong but optional in too many PASS paths.
- `already_present` can be valid, but it should not be represented as a code-changing build PASS unless the required proof for the claimed outcome exists.
- Active machine files still carry amendment-era `@ssot` tags, which can confuse cold agents despite product-home law.

## Parts-Car Judgment

Keep the engine, replace the gauges. The queue, Point B lock, founder UI path, execution truth gate, deploy verifier, BP sync choke point, and founder usability confirm are worth salvaging. The bad parts are mostly authority drift and completion semantics, not lack of infrastructure.

Archive or retire: legacy `MISSION_QUEUE`, overnight/autopilot history, mission `CONTENT` as runtime authority, Voice Rail as an active product lane, and any receipt/report that is stale but presents as current.

## Acceptance Ideas I Would Add

- A static test that rejects any active runner function named `isComplete` if it checks only TECHNICAL_PASS/PASS.
- A live test that intentionally observes deploy lag and requires NOT_LIVE rather than PASS.
- A UI test that confirms LifeRE shows "awaiting founder confirmation" while `founder_usability_pass` is false.
- A receipt test that fails if UI_ALPHA_GATE reused a receipt from a different deploy SHA or older founder regression corpus version.
- A repair test that forces three failures and verifies lessons, research, consensus, and tier expansion fields.
