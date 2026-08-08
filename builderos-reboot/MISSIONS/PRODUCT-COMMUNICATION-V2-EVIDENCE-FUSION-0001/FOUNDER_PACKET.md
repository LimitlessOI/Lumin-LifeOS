<!-- SYNOPSIS: Founder Packet — Communication System V2: Evidence Fusion & Cognitive Dynamics -->

# Founder Packet — Communication System V2: Evidence Fusion & Cognitive Dynamics

**Mission ID:** `PRODUCT-COMMUNICATION-V2-EVIDENCE-FUSION-0001`
**Locked:** 2026-08-07 (Adam — "install all five" versions of the Communication System Blueprint)
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.
**Source doctrine:** `docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md` §19.2, §22 row "V2 — Evidence Fusion & Cognitive Dynamics"

---

## Priority

Second of five, per the blueprint's own stated dependency order: V2 is the shared Evidence Fusion layer that V3 (Perception), V4 (Overlay Action), and V5 (Cross-Domain Personal Intelligence) all depend on. V1 (Voice Presence) ships first because it's the cheapest fix to a real, already-hit failure; V2 second because every later version needs a real, calibrated confidence signal instead of guessing from a single modality.

---

## Problem

Every OS today (LifeOS, and eventually SalesOS/TherapyOS/MediaOS/BuilderOS) that wants to know "how is the user actually doing right now" has to interpret raw signals (words alone, timing alone) independently, with no shared, calibrated way to combine multiple weak signals (what was said, how long the pause was, tone, history) into one confident read — and no way to learn, from real outcomes, which signal matters most in which context.

---

## Desired outcome

1. A real, callable Evidence Fusion service combines transcript, timing, tonality, history, and (when available) face/body signals into one calibrated confidence estimate for the user's current cognitive/emotional state (frustrated, celebrating, confused, curious, excited, calm, concerned, tired, finished, neutral, emphatic).
2. The fusion is modality-weighted and calibratable (per-state offset + temperature), not a single hardcoded formula, so it can be tuned per product/context without rewriting the algorithm.
3. A real learning function exists that adjusts per-modality weights from labeled real examples (which modality's dominant read matched the true outcome), so the system gets better with real data instead of staying static forever.
4. This is domain-independent shared infrastructure (per the blueprint's own §19.2 architecture) — every OS consumes calibrated estimates from this one engine rather than re-deriving its own ad hoc heuristics.

---

## FOUNDER SUCCESS TEST

Given a real transcript + timing + (optional tonality/history/face-body) signal set, the Evidence Fusion service returns a single calibrated state + confidence + explicit per-modality source breakdown (not a black box), matching the already-proven prototype's exact scoring behavior (`scripts/prototype-evidence-fusion-v2.mjs`, 30/30 tests) — reused, not reinvented — and Adam confirms the returned confidence values make intuitive sense against real transcript examples he tries.

## Acceptance command

```bash
npm run lifeos:communication-v2-evidence-fusion:acceptance
```

(System authors this command and the proof script. Founder packet names the bar only.)

---

## PASS criteria (both required)

### 1. Technical PASS — objective, automatable

- Acceptance command exits **0**
- Receipt: `products/receipts/COMMUNICATION_V2_EVIDENCE_FUSION_ACCEPTANCE.json` with `"verdict": "PASS"`
- The ported service's `fuseEvidence()` and `learnWeights()` match the proven prototype's exact scoring/weighting arithmetic — same inputs must produce the same outputs, verified by direct behavioral proof (not just "the export exists"), same discipline as V1's `computeTurnCompletionConfidence`.
- **Failure mode, explicit:** any output drift from the proven prototype on the same input is a FAIL, not a partial pass — this is supposed to be a faithful port, not a redesign.

### 2. Founder usability PASS

- Adam can point to a real transcript exchange and see the returned state/confidence match his own read of what was actually happening in that exchange.

**I'll know this worked when:** the system can look at what was said, how long someone paused, and what happened before, and give me one honest number for how confident it is about what's really going on — not five different systems each guessing on their own.

---

## Out of scope

- Face/body/wearable signal *collection* (V3 Perception, separate mission) — this mission ports the *fusion* logic only; `extractFaceBodyEvidence` accepts already-collected signals, it does not collect them
- Tonality signal *collection* (V1.1 Tonality Engine / V3 Perception, separate mission) — same split: fusion logic accepts a tonality profile, does not compute one from raw audio
- Wiring Evidence Fusion into any live product surface's decision path (that's V3/V4/V5's job, once the shared engine exists to consume)
- Any AI/model call inside the fusion or weight-learning logic — this must remain deterministic, matching the proven prototype exactly
- Redesigning the state taxonomy (frustrated/celebrating/confused/etc.) — reuse the prototype's exact state set

## Document layers (do not mix)

| Layer | Role | Active file |
|-------|------|-------------|
| Founder packet | WHAT + PASS | **This file** |
| Blueprint | HOW to build | `BLUEPRINT.json` (system-authored) |
| Receipts | PROOF | `products/receipts/`, mission proof JSON |
