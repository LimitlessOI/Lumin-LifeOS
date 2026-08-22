<!-- SYNOPSIS: FACTORY-BUILDEROS-PARTS-CAR-CLOSURE-0001 -->

# FACTORY-BUILDEROS-PARTS-CAR-CLOSURE-0001

## Problem
`builderos-reboot/PARTS_CAR_MANIFEST.json` records the keep/adapt/reject decision made
about every file salvaged from the old BuilderOS during the 2026-06 reboot. `BP_PRIORITY.json`
previously claimed this mission was `TECHNICAL_PASS`, but none of its founder packet,
blueprint, receipt, or acceptance script ever existed anywhere in `git log --all` — a
genuinely fabricated pass, found live 2026-08-21 via the BP_PRIORITY guardrail hard-blocking
every commit repo-wide on the resulting mismatch.

A real check (`builderos-reboot/scripts/verify-parts-car-coverage.mjs`, written 2026-08-21)
now runs the manifest against the actual repo and currently reports FAIL: every `import_as_is`
and `adapt_and_import` file exists as intended, but all three files the manifest explicitly
says to `reject` — `scripts/governed-overnight-backlog-run.mjs`,
`services/builderos-governed-loop-executor.js`, `routes/auto-builder-routes.js` — are still
live in the repo.

## Desired Outcome
Either (a) those three files are confirmed to have no live callers and are removed, so the
manifest's reject decisions actually hold, or (b) the manifest is deliberately updated to
un-reject them with a real reason, if founder/architecture judgment has since changed. Either
way, `verify-parts-car-coverage.mjs` should report a genuine PASS, not a masked one.

## FOUNDER SUCCESS TEST
Run `node builderos-reboot/scripts/verify-parts-car-coverage.mjs`; it must report `verdict: PASS`
with `missing_kept_or_adapted: []` and `rejected_but_still_present: []`, and that PASS must
reflect real repo state, not a rewritten check.

## Acceptance
Acceptance command: `node builderos-reboot/scripts/verify-parts-car-coverage.mjs`
