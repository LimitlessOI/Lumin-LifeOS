<!-- SYNOPSIS: Founder packet for the BuilderOS Cognitive Architecture mission. -->

# FACTORY-COGNITIVE-ARCHITECTURE-0001 — Founder Packet

**Point A:** BuilderOS has separated responsibilities (Chair, Architect, Builder, Sentry, CFO, Wisdom) and has started enforcing them mechanically, but reasoning still mostly uses one generalized model perspective per call.  
**Point B:** BuilderOS has a reusable five-layer reasoning stack (Mission → Responsibility → Lens/Cognitive Asset → Model → Execution) and a runnable Chair composer that selects responsibilities, activates lenses, routes to the cheapest capable model, and produces a synthesized transcript with preserved disagreement.

## What the product must do

1. Define the five layers in a canonical spec and constitutional amendment.
2. Represent a lens as a reusable, versioned, evidence-backed knowledge object.
3. Ship a `LENS_REGISTRY.json` and several sample cognitive assets.
4. Implement `services/cognitive-chair.mjs` that composes responsibilities, lenses, and model selection before execution.
5. Implement `scripts/run-cognitive-mission.mjs` so any mission can be run dry or live through the stack.
6. Add acceptance tests.
7. Wire the architecture into the BuilderOS product home and queue.

## Who it serves

- BuilderOS itself (the reasoning engine).
- Every downstream product that uses BuilderOS (LifeOS, SiteBuilder, SMOS, CRM, Legal, Medical, Education).

## What it should feel like

When a hard question arrives, the system does not immediately ask a model for an answer. It first asks:

> How should I think?

Then it activates the right responsibilities and lenses, routes each to the right model, collects independent perspectives, and synthesizes the disagreement into a decision-ready transcript.

## Important constraints

- The model layer must be interchangeable; the value is in the lenses and the Chair composer.
- Disagreement must be preserved, not flattened.
- Lenses must be versioned and measured by Wisdom.
- Dry-run mode must work without spending tokens.
- Live mode must respect the token budget and cost gates already in `council-service.js`.

## Changing priorities

- First vertical slice is the core architecture and six sample lenses.
- Lens Marketplace and external cognitive assets are Phase 2.
- Wisdom-updated trust scores are Phase 3.
