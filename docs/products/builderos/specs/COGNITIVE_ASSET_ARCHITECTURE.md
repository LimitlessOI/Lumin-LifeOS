<!-- SYNOPSIS: BuilderOS Cognitive Asset Architecture — five-layer reasoning stack. -->

# BuilderOS Cognitive Asset Architecture

**Authority:** Founder directive (2026-07-23) — BuilderOS is a reusable reasoning platform, not a collection of applications.  
**Canonical home:** this document  
**Product:** `builderos`  
**Related:** `docs/constitution/AMENDMENT_COGNITIVE_LAYERS.md`, `data/lenses/LENS_REGISTRY.json`

---

## The five layers

```
Mission
    ↓
Responsibility
    ↓
Lens Stack  (Cognitive Assets)
    ↓
Model Selection
    ↓
Execution
```

### 1. Mission
A single, founder-approved objective: move from Point A to Point B. The mission is the only thing that changes between LifeOS, SiteBuilder, SMOS, CRM, Legal, Medical, Education, etc.

### 2. Responsibility
A fixed, separated power that reasons about the mission from a defined angle. The canonical responsibilities are:
- **Chair** — holds the mission, chooses responsibilities and lenses, and synthesizes disagreement.
- **Architect** — turns approved intent into a manufacturable digital twin.
- **Builder** — executes the digital twin without invention.
- **Sentry** — independently tests the result against the mission and the blueprint.
- **CFO** — optimizes ROI and model efficiency without weakening intent.
- **Wisdom** — preserves memory, predictions, outcomes, and lessons.

Responsibilities are not people or models. They are seats that any model can fill once the right lens is active.

### 3. Lens Stack / Cognitive Asset
A lens is a reusable, versioned, evidence-backed way of thinking. It is not a prompt. It is a knowledge object that contains:
- `philosophy` — what does this lens believe?
- `evidence` — what has it observed?
- `strengths` — where is it reliable?
- `blind_spots` — where is it unreliable?
- `confidence` — current measured confidence
- `trust_score` — historical prediction accuracy
- `performs_well` — situations where it adds value
- `performs_poorly` — situations where it is dangerous
- `disagreement_profile` — known conflicts with other lenses

Example lenses: Steve Jobs Product Lens, Toyota Lean Lens, NASA Systems Engineering Lens, CFO ROI Lens, Customer Ease Lens, Competition Lens, Behavioral Economics Lens, Military Red Team Lens.

A responsibility can activate multiple lenses. The Chair can deliberately activate lenses that are known to disagree.

### 4. Model Selection
For each `(responsibility, lens)` pair, the Chair selects the cheapest model that can faithfully run that lens. A lens does not require GPT-4, Claude, or Gemini — it requires a model with enough context and capability for the specific reasoning task. Model selection is a cost/quality routing decision, not a brand decision.

### 5. Execution
The output of the reasoning stack becomes a blueprint, a decision record, a build task, or a SENTRY test. Execution is what happens after the thinking is done.

---

## Why this matters

Current AI systems answer from one generalized perspective. BuilderOS does not. BuilderOS first asks:

> How should I think?

Only then does it ask:

> What should I do?

This makes OpenAI, Anthropic, Gemini, Groq, and future providers interchangeable execution engines. The durable value is the library of cognitive assets and the Chair's composition logic, not the current model provider.

---

## Disagreement is a feature

The Chair must not eliminate disagreement. It must understand and synthesize it. Example:

- **Steve Jobs Lens:** remove half the features.
- **Competition Lens:** add more features.
- **Customer Lens:** make onboarding easier.
- **CFO Lens:** this costs too much.

The Chair's output is not a compromise. It is a decision that names which lenses were heard, which evidence was weighted, and what trade-off was chosen.

---

## Cognitive Asset Marketplace

A cognitive asset can be:
- authored by an expert,
- composed by the Chair,
- improved by Wisdom,
- shared across missions,
- versioned,
- measured,
- trusted or distrusted based on evidence.

Eventually BuilderOS supports a marketplace of reasoning plugins: Toyota Lean, NASA Systems Engineering, Harvard Negotiation, Behavioral Economics, Game Theory, Medical Diagnostic, Military Red Team, and so on. The core system does not change when a new lens is added.

---

## Wisdom loop

After execution, Wisdom updates each lens:
- prediction vs. reality,
- trust score adjustment,
- new evidence,
- blind spot discovery,
- version bump when a lens materially changes.

A lens that consistently outperforms its prior version becomes a more trusted asset. A lens that repeatedly fails is demoted or retired.

---

## First vertical slice

The first implementation (`services/cognitive-chair.mjs`, `scripts/run-cognitive-mission.mjs`) supports:
1. Load a mission statement.
2. Chair resolves the responsibility set and the lens stack.
3. For each `(responsibility, lens)` pair, build a prompt from the lens philosophy.
4. Model router selects a council member.
5. If `callModel` is supplied, run the model and collect the response.
6. Chair synthesizes the independent outputs into a decision-ready transcript.
7. Wisdom records the transcript for later reality comparison.

The first slice runs in dry-run mode by default and executes live models when the `--execute` flag is provided.
