<!-- SYNOPSIS: Adversarial coverage+coherence audit of the A–Z Master Roadmap by the Architect office (Cursor/Opus). Stored BEFORE Devin/Chair passes to preserve independence ordering. -->

# A–Z Master Roadmap — Independent Coverage & Coherence Audit

**Reviewer:** Architect office (Cursor/Opus) · **Date:** 2026-07-20 · **Stored before** Devin/Chair passes.

## Independence disclosure (read first)
**I am not an independent reviewer of this roadmap.** I co-authored ~two-thirds of A–Z (GRAIL 8-field contract, Twin state layer, Context View naming, first-slice contract, offices, Planning Sufficiency Gate). A roadmap reviewed by its co-author systematically misses the blind spots it was built with. Treat this as an **adversarial co-author** pass. The genuinely independent pass — a reviewer who did NOT participate — has **not** happened and is still required. Per the protocol, this file is committed *before* I see Devin's or Chair's conclusions.

---

## A. Coverage verdict

**INTERNALLY INCONSISTENT — localized, non-blocking to Slice T.**

Coverage of *topics* is excellent (the checklist is genuinely complete). But there are specific, verifiable inconsistencies (below) and one structural risk (the linear A→Z framing). None block the first vertical slice; all are fixable with edits, not a rewrite.

---

## B. Missing / implicit-should-be-explicit

| Missing requirement | Evidence from session | Where it belongs | Severity |
|---|---|---|---|
| SO-003 fix as **mission #1** + fact→fact promotion receipt | `docs/FIRST_SLICE_CONTRACT.md` | Slice T (reference the slice contract explicitly) | Med |
| Twin's constitutional root = **§2.0H Founder Intent Model** | North Star §2.0H | Slice I (cite so Twin is subordinate, not a new authority) | Med |
| Reuse existing **memory `PROPOSED→CANONICAL`** promotion gate | `services/memory-capsule.js` (verified) | Slice K (build on it; don't reinvent update classes) | High (rebuild risk) |
| Reuse **`cognitive-core-oracle.js`** | verified live | Slice S ("existing Oracle primitives" — name the file) | Med |
| **`useful-work-guard`** is the mechanism for "runs only on work check" | CLAUDE.md Zero-Waste rule | Slice Y (name it) | Low |
| Verified **self-repair on-disk inventory** (10 real files) | glob (below) | Slice D (replace the 15 aspirational names) | High |
| Marketing-comms **two-checkbox consent** (TCPA/CAN-SPAM) already ratified | SMOS pricing work | Slice H (pointer; different scope from Twin-data consent) | Low |

---

## C. Contradictions

| Roadmap statement | Conflicting reality (verified) | Required correction |
|---|---|---|
| Slice D: self-repair modules "built but **unwired**" | `self-repair-executor` **is** wired — `routes/self-repair-executor-routes.js` + references in `startup/register-runtime-routes.js` & `startup/boot-domains.js` | Change premise to "map actual wiring per module, then wire the genuinely-unwired ones" |
| Slice D lists **15 named modules** (root-cause-chains, negative-knowledge, trust-dashboard, calibration-sampling…) | On disk there are **10 differently-named files**: `self-repair-{escalation-policy, executor, deploy-scheduler, prevention-registry, prevention-hook-planner, prevention-hook-log, memory, lesson-classifier, execution-log, attempt-context}` | Replace aspirational list with verified inventory + map concept→file; the 15-name list is itself an unproven claim |
| Non-Negotiable Delivery Rule #5 "integration path is live" applies to **every** slice | Slices A (roadmap doc) and C (charter) are pure docs with no runtime path | Make completion criteria **slice-type-aware**: doc/charter slices are N/A for #5 (else it's an unpassable check — violates GRAIL's own "no unpassable checks") |
| **Three different truth-grade vocabularies**: Slice E {KNOWN/SUPPORTED/INFERRED/HYPOTHESIS/GUESS/CONTRADICTED/RETIRED}; Slice I {fact\|hypothesis}; CLAUDE.md {KNOW/THINK/GUESS/DON'T-KNOW} | same primitive, three names — the exact collision the roadmap says to eliminate | Unify to **one** truth-grade enum across E/I/K and reconcile with CLAUDE.md |
| Enforcement-status enum: A–Z Slice C has 8 values incl. `suspended`; GRAIL charter has 7 (no `suspended`) | divergence between the two canonical docs | Add `suspended` to GRAIL charter enum; make A–Z defer to GRAIL as the enum's home |

---

## D. Sequence audit

Correctly sequenced (capture→foundation→state→reasoning→calibration): **A, B, C, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S** and the deferrals **X, Y** (evidence-gated) and **W, V** (audit-first). **D** is correct in position but wrong in premise (see C).

**The one serious sequence finding — Slice T is "too late as written."** The strict A→Z reading implies all of A–S must be *built* before the first slice. That re-creates the "build everything before proving anything" failure the **Planning Sufficiency Gate exists to kill.** T should be a **vertical slice that cuts a *minimum* version through I/J/M/N/O/P/R/S**, pulled forward — not gated behind their full construction. Letters must be **capability areas, not a strict build order.**

---

## E. Enforcement audit (every load-bearing word → evidence required)

- "real Digital Twin plumbing / `lifere-twin-store.js`" → **VERIFIED** (files exist).
- "existing data primarily **founder-focused / demo data**" → **UNVERIFIED by me** (reported by prior audit). Needs a per-module data-provenance check before it's stated as fact.
- self-repair "**built**" → files exist (10); "**unwired**" → **CONTRADICTED** for executor. Each module needs an individual wiring receipt before any status claim.
- "existing **Oracle** primitives" → `cognitive-core-oracle.js` exists; *statistical maturity* UNVERIFIED.
- creative-engine "predict before spend" hook → **VERIFIED** (`estimateCost`-class in `services/creative-engine/index.js`).
- Any `proven-live` anywhere in A–Z → **none may stand without a receipt** (8th field). A–Z is disciplined here (mostly "objective/build" language) — good.

---

## F. Proposed corrections (additions/edits, not a rewrite)

1. **Reframe A–Z as capability areas, not a linear build order.** Add a header: "Letters are capability areas; the only thing that *advances* is a receipted slice. Build each capability's minimum version when a slice pulls it." Pull **T forward** as the first slice per `FIRST_SLICE_CONTRACT.md`.
2. **Rewrite Slice D** around the verified 10-file inventory; re-audit wiring; change goal to "classify actual status per module, wire the genuinely-unwired."
3. **Make the Delivery Rule slice-type-aware** (doc slices N/A for "integration path live").
4. **Unify the truth-grade enum** across E/I/K + reconcile with CLAUDE.md.
5. **Move the enforcement-status enum's canonical home to GRAIL**; add `suspended`.
6. **Add "build-on-existing" pointers** to K (memory promotion gate), S (`cognitive-core-oracle`), I (federate the 5 verified stores via adapter, per `DIGITAL_TWIN_CURRENT_STATE.md`) to prevent rebuilds.
7. **Cite §2.0H** in Slice I.

---

## G. Final dissent (three strongest, even though I largely agree)

1. **The A→Z linear framing is itself a drift risk.** A single ordered 26-step list invites "we're on letter K, A–J are done" while almost nothing is `proven-live`. The roadmap's greatest strength (drift prevention) becomes its greatest liability (false linear progress) unless letters carry per-item enforcement status and only receipted slices advance. Reality-is-scoreboard applies to the roadmap too.
2. **This audit is not independent** (see disclosure). A co-author's review of a co-authored roadmap under-detects shared blind spots. The independent pass — Devin integration-grounding + a non-participant reviewer + Chair comparison — is the one that matters, and it is still owed.
3. **The plan can outrun the one proven slice.** A–Z is comprehensive enough to absorb weeks of design while zero receipts exist. My strongest recommendation: **do NOT canonicalize A–Z as a build sequence before Slice T ships one real receipt.** Canonicalize it as a *capability map + coverage checklist* (it is excellent for that). Let the first receipt — not the document — set the pace.

---

## Handoff (protocol)
- I did **not** edit the A–Z roadmap (per instruction). Persisting it verbatim as a non-canonical draft is a Conductor task; I avoided hand-transcribing to prevent drift.
- **Next:** Devin runs an independent integration-grounding review (fail-closed until Devin confirmed operational — else SENTRY/Chair); a non-participant reviewer runs a truly independent pass; **Chair compares reports** without any agent editing the roadmap.
