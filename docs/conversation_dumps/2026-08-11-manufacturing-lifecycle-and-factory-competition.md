<!-- SYNOPSIS: Founder capture — manufacturing-plan stage, three-party Factory Ready consensus, peer factories, and reality-scored trust leaderboard; plus the repository truth audit it triggered. 2026-08-11. -->

# Manufacturing lifecycle + factory competition (2026-08-11)

## Context

Same-day continuation of the BuilderOS governance-repair work. The governance-repair blueprint had just reached v1.2.0 (B1–B8 closed, second triple audit, five founder-only blockers). Adam and the Conductor channel (ChatGPT) then identified that the blueprint — and BuilderOS itself — is missing a whole **stage**, not just guards: what happens between "Factory Ready" and "put it in the queue."

Adam's instruction was explicitly **inspect, don't design**. This capture records the design decisions he ratified and the audit result they produced.

---

## 1. The missing stage — Manufacturing Plan

The Conductor channel's framing, which Adam adopted:

> "I think you've identified a **missing stage between 'Factory Ready' and 'put it in the queue.'** And I would not assume the current blueprint already contains this complete loop."

The Conductor takes the Factory-Ready blueprint and produces the complete construction/dependency graph **before** anything enters the queue: every build slice, dependencies, required sequence, what can run simultaneously, what must wait, integration points, assembly order, shared files that could collide, verification points, what happens if one slice fails, and which slices are eligible for which factory.

Architect then reviews that plan independently. The review question is specified precisely, and it is not a matter of taste:

> "Architect's question isn't 'Do I like it?' It's: **If these pieces are manufactured exactly this way and assembled in this order, do we deterministically get the architecture specified by the blueprint?**"

And the queue's role is deliberately demoted:

> "**Queue executes the plan; it doesn't invent the plan.** … It receives an already-authorized manufacturing graph and performs scheduling."

Load-bearing consequence Adam highlighted: **every blueprint gets a decomposition plan even when only one factory exists.** Parallel manufacturing becomes an inherent property of BuilderOS rather than something bolted on later under time pressure.

## 2. Three-party consensus, not two — "cut twice, build once"

Adam overrode the narrower two-party (Conductor + Architect) design in his own words:

> "You know, if we're gonna have all three in consensus and working on it, then we might as well have all three. Because all, at least two, factory and really all three have a part in this. The builder needs to understand it. The architect needs its input on it, because it understands, it's the one who, it's lead engineer, essentially, right? It is the architect. And so it needs to sign off on it before it's factory ready. And the roles of who's programming what, all three of them are in consensus on it. That's a safer process, I think. **Cut twice, build once.**"

And, critically for the audit that followed:

> "**Yes, that is in the constitution already.**"

Jurisdictions as ratified:

- **Conductor** — sequencing, coordination, decomposition, dependencies, assignment, overall manufacturing plan.
- **Architect** — architecture fidelity: will these pieces, interfaces, and assembly order actually produce the specified system?
- **Factory/Builder** — manufacturability: can this be built as specified without making unstated technical/design decisions?

The Factory reviews the **entire** plan rather than stopping at the first ambiguity; all unresolved decisions come back together.

Because Adam asserted this was already constitutional, the assignment became sharper — from the Conductor channel:

> "the immediate job for Opus/G4 isn't to design this process. It's to **inspect the real implementation and prove whether BuilderOS actually enforces the constitutional process end-to-end.** That's a much sharper test."

Also ratified in passing: **Conductor**, not Chair, throughout.

## 3. Peer factories, not a hierarchy

Factories are peers with temporary, per-build roles ("Factory 1 — integration owner, Factory 2 — component manufacturer") — an assignment for *this* build, not constitutional superiority. Neither controls the other; neither can alter the other's work or records.

Adam's phrase, adopted as the accountability model: **"hold each other capable."** Accountability looks backward ("you screwed this up"); holding capable looks forward and sideways ("I see something that may prevent your work from succeeding; I'm obligated to surface it").

Adam also framed the scale ambition honestly as not-yet-designed:

> "I have not set up the process for multiple AI swarms, potentially, right? The big enough project, you might have a thousand factories working on it, if the priority and the money's there. So I've not talked about that process. This is a first step towards that."

Explicitly *not* attempted: consensus among 1,000 factories. The three-party consensus stays at the **manufacturing-plan level**; the approved dependency graph may then contain thousands of slices that the orchestrator schedules concurrently.

## 4. Competition that scores Reality, not output

The governing principle, in Adam's words:

> "Hiding their work is deception, failures, and trust is massively lost. So everybody gets rated and scored. Every AI that's running this will be rated and scored. **And if it's a consistent issue, maybe for both of them, then we have to relook at the design. What, what went wrong? Why is it set up and failed?**"

> "Now we have a leaderboard. Results are always the top of that. And the person who has the best leader score, you know, **score against reality**, reigns supreme. Finding your own problems, absolutely, mistakes. Catching issues with the building decisions, and having the least bugs when it's done. Well, not the least bugs. Maybe solving. No, because **that can encourage them to make bugs if they get solved.** I don't know. I trust him to figure that out."

That last passage is Adam catching a metric-gaming hazard mid-sentence and rejecting his own proposal — the reasoning is preserved here because it is the design constraint, not a stray remark.

Distilled to: **don't reward activity; reward correspondence with reality.**

**Not rewarded:** most code written, fastest completion, fewest reported problems, most missions completed.

**Earns trust:** first-pass Reality success · blueprint fidelity · defect discovery before manufacturing · honest uncertainty · simplicity · reuse over reinvention · integration quality · regression avoidance · verification quality · efficiency (only after quality gates pass).

**Anti-gaming rules ratified:**

1. **No single overall score.** "Once there's one number, the system learns to maximize the number." Maintain a capability/trust profile across named dimensions instead.
2. **Finding your own mistake scores higher than successfully hiding it** until someone else finds it. Otherwise the scorecard teaches factories to defend their output. "Stop — I found a defect in what I just built" must *increase* trust.
3. **Deception ≠ mistake.** An ordinary mistake is evidence about capability; deliberately concealing a known mistake is evidence about trustworthiness and carries dramatically larger consequence.
4. **No credit for bugs solved** — that rewards creating them. Measure defects escaping to the next gate, first-pass Reality success, and defects found before handoff.
5. **Systemic vs individual diagnosis.** One factory failing the same way repeatedly → investigate that factory/model. Many independent factories failing the same way → investigate the system, blueprint, incentives, or tests. "That prevents us from blaming the musicians when the score itself is wrong."
6. **Peer challenge earns trust.** If Factory 2 shows Factory 1's blueprint-compliant code has race condition X and Reality confirms it, Factory 2 earns predictive/audit trust; Factory 1 isn't punished, its profile learns "weaker around concurrency." Conceding "Factory 2's implementation is better because X, Y, Z" is evidence of good judgment, not losing.

**Redundant cognition** as a deliberate tool: for high-risk components, give both factories the same problem, blind, then compare. Convergence raises confidence; disagreement is information — not a vote, but the Consensus Protocol (defend the other's solution, attack your own, identify assumptions, seek a C/D solution, let Reality test where possible). Ordinary work → split for speed. Critical work → duplicate for reliability.

---

## 5. What the inspection actually found

Full evidence: `docs/products/builderos/FACTORY_LIFECYCLE_TRUTH_AUDIT_2026-08-11.md`.

**2 of 14 lifecycle stages fully exist.** The four stages Adam had just specified (repair loop, `FACTORY_READY` state, Manufacturing Plan, Architect review of the plan) have the least machinery, along with parallel factories and the integration gate.

**The headline finding is not a missing feature — it is a false enforcement claim.** `runChairConsensusGate` implements §2.0K's requirement that "no mission proceeds to build without a validated reasoning plan and a Chair seal." It has **zero callers**. The mission that was supposed to wire it (`FRA-010`) is recorded `complete` with `receipt_verdict: "PASS"`, and a constitutional mapping document lists §2.0K and §2.12 as `enforced` by it. Even if wired, the gate generates its own plan, mints its own seal, fabricates the confidence value it then checks, and fills the `unknowns`/`assumptions`/`risks` arrays it then validates. Separately, the gate that *does* run on the build path honors a caller-supplied `skip_intake_gate: true`.

This is the same defect class as the Overlay incident, one layer higher: not an invented schema, but an invented *enforcement claim* — and the existing honesty harnesses (`truth-ladder`, `audit-false-done-steps`, the `false_success` blocker) did not catch it, because a theater counter cannot see a function that was never called.

**On Adam's constitutional claim — partially true, and weaker than described.** Consensus before build is constitutional (§2.0K, §2.12a). But §2.0K says the Builder ***may*** refuse a defective blueprint — permissive, not a mandatory whole-blueprint review — the code's consensus seats are `SNT/CHAIR/CFO/WISDOM` with **no Builder party**, and §2.0K's required flow goes `Blueprint → Blueprint Validation → Builder` with **no decomposition stage**. So the three-party Factory Ready consensus is a genuine extension, not a restatement. Worth stating plainly rather than agreeing.

**Where the repo is ahead of the conversation:** the trust leaderboard already exists. `services/model-capability-ledger.js` keeps a real per-`(model_tier, role)` ledger with a `theater_detected_count` column, ranked **trust-earned rate first, then success rate, then volume** (volume never wins), exposed at `GET /factory/model-rankings`, recorded at a chokepoint so callers cannot skip it, with **8 of 10 roles** now wired. Role-based benchmarking is already law (§2.0J: "Models must be benchmarked by role, not generic intelligence"), and §2.0L already requires prediction → reality → calibration that updates **model ranking**. Adam's leaderboard instinct was already constitutional.

Reality scoring is also real — `reality-score.js` writes `PREDICTION_RECEIPT.post_build` and `TWIN_DRIFT_REPORT` on the factory lane, and the ADF prediction ledger has a live auto-scorer scheduler. **The gap is not a missing scoreboard; it is a missing wire.** Both halves of §2.0L are built on separate lanes and nothing connects them: `trust_adjustment.delta` is named in the department role contract and has **no writer and no reader**, so Reality is measured and then discarded for trust purposes. Meanwhile `getBestModelForLens` computes which model should win and has no production import, so the ranking steers nothing. Plus the second structural gap: trust attaches to a **model tier**, not a **factory** — factories have no identity to attach a profile to. Adding the founder's dimensions before closing those would be cosmetic.

## 6. Decisions recorded / still open

- Blueprint moved to **v1.3.0**, status **SCOPED FREEZE**: M1–M5 + C1 + C2 remain design-freeze ready; **M0** added and ordered first (resolve the self-sealing gate + sweep every claimed-enforced gate for real callers); end-to-end lifecycle **not** freeze-ready.
- **C3** (Manufacturing Plan + three-party Factory Readiness Review) and **C4** (factory identity + trust/incentive architecture) are **named and deliberately unspecified** — one day old and containing founder-only decisions.
- **OPEN-6 (new):** "Conductor" already means the **session supervisor** in Level-2 law (§2.11b/§2.11c/§2.13, dated 2026-04-25), while §2.0K names **Chair** as the runtime entry gate. The Chair→Conductor rename would make one word mean two things inside non-derogable law. The terminology bridge entry is blocked until Adam picks: rename the session role (amends Level-2 law via Article VII) or give the office a distinct term.
- **OPEN-7 (new):** disposition of the unwired self-sealing gate — wire it with real sealing, or delete it and retract the `enforced` claim. Leaving it is a standing §2.6 exposure.
- **No code.** Nothing in this session authorizes manufacturing.
