<!-- SYNOPSIS: Cognitive Core laws — judgment compiler constitution (subordinate to North Star SSOT) -->

# Cognitive Core Laws

**Status:** Product constitution for the Cognitive Core (Era-1+)  
**Authority:** Subordinate to `docs/constitution/NORTH_STAR_SSOT.md`  
**Canonical home:** this file  
**Last Updated:** 2026-07-19

---

## Thesis

LifeOS is not learning the user as a static twin.

It is learning how to improve the **compiler** that models the user:

Observe → Predict → Observe reality → Explain the miss → Improve the modeling process → Predict again.

The object optimized is the judgment engine (routing, gravity, causal graph, calibration) — not a claim of identity.

---

## Five immutable laws

### Law 1 — Models are hypotheses

No twin, program, value, or belief is treated as truth.

Every model carries: evidence, confidence, recency, contradiction history, change trajectory.

The system never says “Adam is…”. It says “Current best-supported hypothesis…”.

### Law 2 — Trust is earned empirically

No feature gains autonomy because a flag was flipped.

Autonomy requires: prediction improved, calibration improved, misses decreased, delegation succeeded.

Evidence over configuration.

### Law 3 — Perspective precedes retrieval

Never retrieve first. Always ask: who is thinking?

Identity chooses memory. Memory does not choose identity.

### Law 4 — Conflict precedes synthesis

Never average capsule outputs. Expose disagreement first (tension ledger), then synthesize.

### Law 5 — Every miss improves the engine

A miss updates the compiler: routing, gravity, calibration, causal graph — not only the twin surface.

A miss is an investment.

---

## Seven-layer stack

1. Identity — who is being modeled / worn  
2. Programs — deep recurring mechanisms (hypotheses, not labels)  
3. Situation — stakes, people, energy, history  
4. Perspective — capsules as attention lenses  
5. Attention — scarce working memory, gravity, suppression  
6. Reasoning — generate, challenge, conflict, synthesize  
7. Calibration — prediction, outcome, miss, correction, trust by domain  

---

## Cognitive vs domain knowledge

| Layer | Owns |
|-------|------|
| Cognitive Core | How the person decides, learns, biases, values-as-proven, trust-by-domain |
| Product apps | Domain facts (SEO, HTML, markets, clinical protocols, etc.) |

Apps consult the core. They must not dump domain junk into the cognitive model.

---

## Framing

Primary asset: a continuously improving **judgment compiler** that learns, with measurable evidence, how to think *with* the user before it ever thinks *for* them.

Do not market “digital immortality.” Frame as preserving hard-earned judgment with transparent confidence and recalibration.

---

## Era map (product bands)

| Era | Name | Ideas | Status |
|---|---|---|---|
| 1 | Learn Me | #1–6 | Shipped |
| 2 | Improve Me | #7–12 | Shipped |
| 3 | Extend Me | #13–18 | Shipped |
| 4 | Trust Me | #19–24 | Shipped |
| 5 | Preserve Me | #25 | Shipped — sealed packages + consent transmission |
| 6 | Transmit Me | #26–30 | Shipped — marketplace, interrupts, debt, trees, import |
| 7 | Calibrate Me | #31–35 | Shipped — heuristics, calibration, transfer, auto-tree, rituals |
| 8 | Compound Me | #36–40 | Shipped — product can_act bridge, improvements, ladder |
| 9 | Govern Me | #41–45 | Shipped — integrity audit, conformance, decay, drift, findings |
| 10 | Multiply Me | #46–50 | Shipped — council consensus, benchmark, replay, ROI, ship-queue bridge |

Era-6+ were not in the original five-era brainstorm; they absorb orphaned scale/calibrate/compound/govern ideas after Preserve Me. Era-10 closes the 50-idea roadmap and the self-fix loop back into the governed factory (SO-001).

## Closing the loop (depth, not an Era 11)

After the 50-idea roadmap, an external audit (2026-07-19) named the honest gap: wide and shallow — the machinery was proven but the loop never closed on real data, so most domains sat at `n<5` and `can_act` refused everywhere. The right move was **not** a new era but making Law 5 physically true end-to-end:

- **Outcome Oracle (Layer A):** a decision's outcome is resolved from a **real receipt** (deploy SHA / SENTRY pass-fail / revert / CI) with provenance — no human retype, `captured_how='receipt_verified'`, fail-closed (a receipt whose verdict is unresolvable is never guessed).
- **Proper scoring:** the scoreboard is no longer a naive Brier average. Murphy's exact decomposition (Brier = Reliability − Resolution + Uncertainty), reliability bins, confidence gap, and an **anytime-valid e-value** that refuses to flag small-n noise.
- **Recalibration is earned:** the Platt map stays the identity until n≥6 **and** e-value≥3 — Law 2 applied to the calibration correction itself (evidence over configuration).
- **Decide gate is load-bearing:** Chow's reject rule turns a corrected confidence into **proceed / verify / abstain**, thresholded by stake, and every call is logged.
- **Correct subject:** the loop scores the **principal's** judgment. The builder's own self-confidence is deliberately excluded — mixing them would score the wrong mind and is a Law-1/honesty violation dressed as evidence. Machine-reliability calibration, if ever wanted, gets its own board.

Open (honestly): the oracle needs a prediction journaled *before* the receipt exists; automatically capturing the principal's decision-time prior from chat is the next tap and is not yet built.
