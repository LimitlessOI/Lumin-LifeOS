<!-- SYNOPSIS: Founder Packet — Communication System V3: Tonality, Face, Body, Biometric Perception -->

# Founder Packet — Communication System V3: Perception

**Mission ID:** `PRODUCT-COMMUNICATION-V3-PERCEPTION-0001`
**Locked:** 2026-08-08 (Adam — "install all five" versions of the Communication System Blueprint)
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.
**Source doctrine:** `docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md` §22, row "V3 — Tonality, Face, Body, Biometric Perception"

---

## Priority

Third of five. Depends on V2 (Evidence Fusion) being real and shipped first — V3's fusion logic imports `extractTranscriptEvidence`, `extractTonalityEvidence`, and `fuseEvidence` directly from `services/evidence-fusion-service.js` rather than re-deriving them, per the blueprint's own stated dependency order.

---

## Problem

Text and timing alone miss a lot of what a person is actually communicating — a frown, a lean-forward, a racing heart rate are all real signal that a purely text-based system throws away. But collecting any of that without explicit, per-context, revocable consent would be a real trust violation, not a feature.

---

## Desired outcome

1. A real, callable Perception service fuses optional face, body, and biometric evidence with the existing transcript/tonality evidence (via V2's Evidence Fusion service) into the same calibrated state/confidence output V2 already produces — perception is an additional evidence source, not a separate output format.
2. Face/body/biometric evidence is used **only** when explicit per-channel consent (`camera`, `biometric`) is present — no channel is read, scored, or fused without it, verified structurally (not just by convention).
3. Positive-signal detection (smile, nod, leaning forward, raised eyebrows, steady gaze, expressive gesture) is surfaced explicitly, not just folded into a single confidence number — matching the blueprint's own emphasis that positive signals matter as much as risk signals.

---

## FOUNDER SUCCESS TEST

Given the same transcript + timing inputs as V2, plus optional face/body/biometric frames, the Perception service returns the identical V2-shaped output (state/confidence/sources) when no visual/biometric consent is present, and a richer, still-honest output when it is — with consent state visible in the result, not silently assumed. Matches the already-proven prototype's exact behavior (`scripts/prototype-perception-v3.mjs`, 27/27 tests), reused, not reinvented.

## Acceptance command

```bash
npm run lifeos:communication-v3-perception:acceptance
```

(System authors this command and the proof script. Founder packet names the bar only.)

---

## PASS criteria (both required)

### 1. Technical PASS — objective, automatable

- Acceptance command exits **0**
- Receipt: `products/receipts/COMMUNICATION_V3_PERCEPTION_ACCEPTANCE.json` with `"verdict": "PASS"`
- The ported service's `fusePerception()` matches the proven prototype's exact behavior on the same inputs, including the consent-gating (face/body/biometric evidence must be structurally absent from the result when consent is false, not merely unused).
- **Failure mode, explicit:** any consent leak (a channel's evidence appearing in the result without explicit consent) is a FAIL, not a partial pass — this is a trust boundary, not a preference.

### 2. Founder usability PASS

- Adam confirms the consent model matches his expectation: no camera/biometric signal is ever fused without an explicit per-context yes.

**I'll know this worked when:** the system can pick up on more than just my words — but never more than I've actually agreed to share.

---

## Out of scope

- Real camera/wearable signal *collection* (hardware/browser integration) — this mission ports the *fusion* logic only, operating on already-collected frame data (synthetic fixtures in tests, matching the prototype)
- Wiring Perception into any live product surface's decision path (V4/V5's job)
- Any AI/model call inside the fusion logic — deterministic, matching the proven prototype exactly
- Redesigning the consent model — reuse the prototype's exact `hasConsent()` gate

## Document layers (do not mix)

| Layer | Role | Active file |
|-------|------|-------------|
| Founder packet | WHAT + PASS | **This file** |
| Blueprint | HOW to build | `BLUEPRINT.json` (system-authored) |
| Receipts | PROOF | `products/receipts/`, mission proof JSON |
