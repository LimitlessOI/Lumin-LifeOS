<!-- SYNOPSIS: Founder Packet — Constitutional Learning Architecture -->

# Founder Packet — Constitutional Learning Architecture

**Mission ID:** `FACTORY-CONSTITUTIONAL-LEARNING-ARCHITECTURE-0001`  
**Product:** BuilderOS

## Problem

Taloa is a constitutional learning institution, but the institution currently has no executable learning layer. The first buildable slice was the Enforcement Matrix (Phase 0). Phase 1 must install the learning architecture: Reality Alignment, Confidence Vectors, Human Constellation, Causality, Readiness, Perspective Expansion, Calibration Ledger, Office Trust Ledger, and the Solomon Wisdom Lab. Without these engines, the Constitution can be enforced but the system cannot learn from reality, and BuilderOS cannot become self-improving.

## Desired Outcome

Implement the engines and data schemas defined in `docs/products/builderos/specs/CONSTITUTIONAL_LEARNING_ARCHITECTURE.md` so Taloa can continuously improve its understanding through reality. Each engine is a service under `services/` with an `@ssot` JSDoc tag, a `Mission Contribution` field, and a minimal smoke test. The Human Constellation becomes the canonical person model that all OS products project. No office becomes the source of truth; every engine is calibrated by reality.

## FOUNDER SUCCESS TEST

- `npm run builder:preflight` passes.
- Each new service passes a minimal unit test or smoke test.
- `docs/products/builderos/PRODUCT_HOME.md` change receipts are updated.
- `docs/CONTINUITY_LOG.md` is updated.

## Non-Negotiables

- The Human Constellation is the canonical person model; all OS products project it.
- No office becomes the source of truth; every engine is calibrated by reality.
- Every engine must include a `Mission Contribution` field.
- Builder Simplicity: prefer the simplest implementation that preserves future adaptability.
- All new `.js` files must include an `@ssot` JSDoc tag pointing to `docs/products/builderos/PRODUCT_HOME.md`.

## Scope

Phase 1 installs the Reality Alignment Engine, Confidence Vector Model, Human Constellation service, Causality Engine, Readiness Engine, Perspective Expansion Engine, Calibration Ledger, Office Trust Ledger, and Solomon Wisdom Lab. Phase 2 (safety/coaching) and Phase 3 (BuilderOS self-improvement instruments) are out of scope for this mission and will follow in subsequent missions.
