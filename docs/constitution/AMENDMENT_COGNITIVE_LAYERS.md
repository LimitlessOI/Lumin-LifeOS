<!-- SYNOPSIS: Constitutional amendment ratifying the five-layer cognitive reasoning stack and cognitive assets. -->

# Amendment — Cognitive Layers and Cognitive Assets

**Date:** 2026-07-23  
**Authority:** Founder directive, ratified by Chair  
**Supersedes:** nothing; extends `NORTH_STAR_SSOT.md` and `AMENDMENT_BUILDEROS_CONVERGENCE.md`  
**Canonical spec:** `docs/products/builderos/specs/COGNITIVE_ASSET_ARCHITECTURE.md`

---

## Ratification

BuilderOS is a reusable reasoning platform. Every mission — LifeOS, SiteBuilder, SMOS, CRM, Legal, Medical, Education — uses the same five-layer reasoning stack.

## The five layers

1. **Mission** — founder-approved Point A → Point B.
2. **Responsibility** — separated powers: Chair, Architect, Builder, Sentry, Office of Efficiency (Efficiency Officer), Wisdom.
3. **Lens Stack** — reusable, versioned, evidence-backed cognitive assets.
4. **Model Selection** — cheapest capable execution engine for the active lens.
5. **Execution** — blueprint, decision, build, test, reality verification.

## Core rule

Before any model answers "What should we do?" the Chair must first answer "How should we think?" by selecting responsibilities and lenses. The model is selected after the thinking strategy is decided.

## Cognitive asset definition

A cognitive asset is a knowledge object with:
- philosophy, evidence, strengths, blind spots;
- confidence, trust score, performance boundaries;
- version history and Wisdom updates.

Cognitive assets may disagree. Disagreement is preserved and synthesized, not flattened into compromise.

## Marketplace

Cognitive assets may be authored by experts, composed by the Chair, improved by Wisdom, shared across missions, and measured by outcome. The core system must not change when a new asset is added.

## Enforcement

All new reasoning automation in BuilderOS must route through the cognitive chair when a mission requires more than one perspective or when the stakes are architectural, product, security, financial, or customer-facing.

---

## Implementation reference

- `services/cognitive-chair.mjs` — chair composition engine.
- `data/lenses/LENS_REGISTRY.json` — canonical lens catalog.
- `scripts/run-cognitive-mission.mjs` — CLI runner.
- `tests/cognitive-chair.test.mjs` — acceptance tests.
