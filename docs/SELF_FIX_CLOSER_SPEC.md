<!-- SYNOPSIS: Build spec — SENTRY findings → improvement-loop self-fix closer (conductor-authored; system builds) -->

# Build Spec: Self-Fix Closer (SENTRY findings → improvement loop)

**Authored by the conductor per SO-001; BUILT BY THE SYSTEM through the governed
pipe (cheapest tier first). Do not hand-write the module.** This spec is the
input; the system is the hands.

## Why (founder direction)

- "Get the system to be able to do your job — to fix itself." — continuously, not
  overnight-only.
- "When SENTRY flags a problem, it should also give a solution … we don't believe
  in impossible." (SO-002 solution-mandatory amendment, `docs/SENTRY_PREALPHA_DOCTRINE.md`.)

Today the conductor does this by hand: read a SENTRY finding (failed assertion or
Layer B UX friction point), turn it into a queued build step, let the loop build
it, re-run the gate. This closer makes the **system** do that, so the flag →
propose → build → re-verify loop runs without a human.

## What to build (single new module)

`services/sentry-findings-to-improvement-feed.js` — a pure adapter with ZERO
import-time side effects.

**Named exports:**

- `normalizeSentryFindings(gateResult)` → array of
  `{ code, detail, proposed_solution, severity, source }`.
  - Input is the JSON produced by the SENTRY pre-alpha gate:
    - Layer A receipt (`products/receipts/SITE_BUILDER_PREALPHA_LAYER_A.json`):
      each failed `step` → a finding.
    - Layer B response (`POST /api/v1/sites/prealpha/layer-b`): each failed step
      → a finding; each `uxCritique.friction_points[i]` paired with the matching
      `uxCritique.improvements[i]` → a finding whose `proposed_solution` is the
      improvement.
  - **Solution-mandatory (fail-closed on the CONTRACT, not the feature):** if a
    finding has no `proposed_solution`, synthesize the smallest concrete next step
    (e.g. "inspect <assertion>; smallest experiment: <X>") and mark
    `proposed_solution_source: 'synthesized'`. Never emit a finding with an empty
    solution. "Impossible" is never a value — use "not solved yet" + next step.
- `toReadinessFindings(findings)` → `{ blockers, warnings }` in the EXACT shape
  `services/builderos-improvement-loop.js` already consumes
  (`readiness.blockers[]`, `readiness.warnings[]`, each `{ code, detail }`), so
  the existing improvement loop turns them into ranked proposals +
  blueprint-delta contracts. **Do NOT create a secondary queue** — the improvement
  loop forbids it (`consensus_contract.note`). Feed the existing inputs only.

## Acceptance (PASS = exit 0)

Author `scripts/verify-self-fix-closer.mjs` asserting, offline (no network):

1. `normalizeSentryFindings` on a fixture Layer B result with 2 friction points +
   1 failed assertion returns 3 findings, each with a non-empty `proposed_solution`.
2. A finding whose source critique lacks an improvement still gets a synthesized,
   non-empty `proposed_solution` with `proposed_solution_source: 'synthesized'`.
3. `toReadinessFindings` output shape matches what
   `buildBuilderOSImprovementLoopStatus({ readiness })` accepts, and feeding it
   yields ≥1 proposal with a `blueprint_delta`.
4. No `proposed_solution` equals "" / "impossible" / "n/a" (case-insensitive).

## Wiring (after the module + acceptance pass SENTRY)

The SENTRY gate runner (`scripts/sentry-site-builder-prealpha-gate.mjs`) calls
`normalizeSentryFindings` on both layer results and writes the readiness-shaped
findings where the improvement loop reads them, so a failed/"rough" gate
automatically produces governed improvement proposals. This closes the loop:
**SENTRY flags + proposes → improvement loop → governed build → gate re-verifies.**

## Provenance

- SO-002 + solution-mandatory amendment: PR #283, #286.
- Two-layer gate + completion wiring: PR #280, #281, #282, #284.
- Example real finding to fixture from: Layer B live run on
  `onlinewellroundedmama.com` (verdict "rough": limited templates/palettes,
  unclear chat purpose, unguided editor) — already queued as `sb-editor-onboarding-copy`.
