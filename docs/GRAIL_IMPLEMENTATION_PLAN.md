<!-- SYNOPSIS: GRAIL — the enforceable governance layer + phased implementation plan for everything designed 2026-07-20 (doctrine → mechanism). Subordinate to North Star; pre-Article-VII plan, not law. -->

# GRAIL — Governed Reasoning, Autonomy & Integrity Layer

**What GRAIL is:** the layer that turns the doctrines written today into **mechanical enforcement**. Its founding rule (from North Star §2.18.5 and the Gate Charter): *paper law without a gate is incomplete law.* Therefore **no rule enters GRAIL without four things**: the mechanism that enforces it, a test proving the gate **fires on real breakage**, a test proving it **passes on real success**, and a named **observer** (a different power that checks the checker — the Observer Principle). Any rule that cannot be given those is **not a law yet** — it is a labeled candidate.

**Status:** Implementation plan + governance spec. **NOT ratified law.** Pre-Article-VII.
**Authority:** Subordinate to `docs/constitution/NORTH_STAR_SSOT.md` (§2.0 root). Consolidates: `docs/constitution/UNIFIED_DOCTRINE_MAP.md`, `docs/SELF_REPAIR_DOCTRINE.md`, `docs/CREATIVE_ENGINE_AND_PROGRESS_DOCTRINE.md`.
**Who builds it:** the **conductor writes specs**; server modules are built through the **governed factory (SO-001)**, so SENTRY proves each independently. Hand-authored here: this plan, specs, docs, CI/hooks.
**Name:** "GRAIL" adopted per founder (backronym above is a suggestion; the name is his to lock).
**Last Updated:** 2026-07-20

---

## The GRAIL contract (the shape every rule must take)

| Field | Meaning |
|---|---|
| **Rule** | the principle, plainly stated |
| **Category** | empirical / governance / default-strategy (only the first two can be laws — Law-Category Test) |
| **Mechanism** | deterministic check where possible (git ancestry, schema, mount-resolution — unrationalizable by any model); cross-model where judgment is required; human-sample only where neither works |
| **Fires-on-breakage** | a test that proves the gate blocks a real violation |
| **Passes-on-success** | a test that proves the gate allows a real valid case (no unpassable checks) |
| **Observer** | the *different* power that audits this gate (never the gate itself) |
| **Override** | how a human bypass is logged + sampled (bounded, never silent) |
| **Enforcement status** | current honest live state on an ordered ladder: `candidate` → `specified` → `built-unwired` → `partially-enforced` → `proven-live`, plus off-ladder `known-violation` and `retired`. Every transition (especially `built-unwired → proven-live`) requires a **receipt**: commit · wiring point · fires-on-breakage result · passes-on-success result · independent observer · timestamp. "Enforced" is therefore a *verified state transition*, not descriptive language. Defaults to `candidate`; reaches `proven-live` **only** when the fires-on-breakage test passes in CI under an independent observer — making an SO-003 overclaim structurally impossible. |

A rule missing any field ships as **candidate**, not law. This is the whole difference between GRAIL and "nice words." *(Eighth field added 2026-07-20 from the tri-AI division-of-labor review — it mechanizes the SO-003 lesson: "enforced" is a receipt, not an adjective.)*

> **Completeness pass (2026-07-20):** this plan was originally governance-only and silently omitted the *creative-production stack* (tonight's opening topic) and several intelligence components. Those are now added below (Phase A, expanded Phase 2) plus an explicit **"Deferred with reasoning"** section and a **coverage map**, so nothing from tonight is dropped without a reason. **Update (2026-07-20b):** added **Phase B — the state layer (Digital Twin)** after a code audit found the Twin is *real but fragmented across ≥5 implementations with a live `capsule` naming collision* — the missing "state, not governance" abstraction, folded in audit-first rather than assumed clean. See `docs/CREATIVE_ENGINE_AND_PROGRESS_DOCTRINE.md` and the media-stack brainstorm for the source ideas.

---

## Phase A — The creative production stack (audit-first; parallel foundational track to Phase 0)

**Why this exists:** tonight opened with the video/image stack. A plan that gates generation but never *builds* generation is half a plan. **What's actually live (verified 2026-07-20):** Flux-Schnell stills via Replicate + FFmpeg assembly (`services/creative-engine/` → `services/video-pipeline.js`) and audio via ElevenLabs (`video-pipeline.js` + voice services), reachable from the creative-engine's FFmpeg-compose delegation. **What's gated / not live:** advanced video generation (Wan/Kling) is explicitly flagged `Enable after footage_edit is tip-proven` in `modes/generative-broll.js`. So this is **audit + extend** on a *real but partial* stack — the video-gen tier is a **build**, not a wiring. Runs in parallel with the governance wiring in Phase 0.

1. **Media Model Router** (partial today → make it *self-calibrating*): route each job by **quality × speed × cost**, not hardcoded models; **log cost/latency/quality per job** → feed the Phase-3 scoreboard + Oracle. Includes **quality-floor routing** (cheapest model that clears the bar per format), **live provider price arbitrage**, and an **open-weight self-host escape valve** when volume justifies. *Spec → factory.*
2. **Creative Genome** (per creator/brand): pacing, humor, energy, storytelling, camera movement, editing rhythm, emotional profile — plus a **brand/character consistency lock** (identity embedding) so identity is known *before* rendering.
3. **Generate-Once-Use-Everywhere:** every asset reusable across SMOS / SiteBuilder / LifeRE / email / ads; **cross-creator generic-asset cache** for commodity shots.
4. **Director-then-Cinematographer two-pass:** an LLM writes the shot list / brief → the media model executes it.
5. **Negative-render KB:** failed prompt/model combos stored (reuse the shipped `self-repair-negative-knowledge.js` pattern) so spend is never repeated.
6. **Predict-before-spend:** a **Tier-2 money gate** (Gate Charter) — estimate expected performance/ROI before GPU spend; low-ROI renders are refused or downgraded.

**Enforceability:** predict-before-spend and negative-render are gates (**fires-on-breakage:** a render with no ROI estimate, or a known-failed prompt/model combo, is blocked; **passes-on-success:** a novel, ROI-estimated render proceeds). Router calibration is a Phase-3 scoreboard claim. **Sequencing:** per-job cost/latency/quality logging is *capture-first* and must precede any "taste" weighting.

## Phase B — The state layer: the Digital Twin as center of gravity (audit-first; the layer *before* the reasoning gate)

**Why this exists (the missing abstraction — state, not governance):** GRAIL governs *how* reasoning happens; the Phase-2 reasoning gate asks Mission/Customer/Objection — but *where do those answers come from?* From a continuously-evolving **state model**, or every artifact starts from scratch. That model already exists as the **Digital Twin** — constitutionally the **Founder Intent Model** (§2.0H). **Do not build a new "Living Model."**

**Grounded reality (verified 2026-07-20, not assumed):** the Twin is **real but fragmented** — there is *no single canonical object* everything reads/writes. State lives across ≥5 live implementations: **Cognitive Core** (decision model: programs/values/judgment/trust-by-domain/calibration/oracle), **Memory** (knowledge store: `memory_capsules`, working/institutional/relationship/provenance/retrieval/embeddings), **LifeRE's own** `lifere-twin-store` cluster, **LifeOS** `lifeos-twin-simulator` + `twin-auto-ingest`, and **Creator** `creatorPersonaTwin`. The file named `digital-twin.js` is **legacy/dead**. So this phase is **canonicalization + consolidation**, not greenfield.

**Naming collision — RESOLVED (decision 2026-07-20):** "capsule" is overloaded — `memory-capsule.js` = a *storage unit*; `cognitive-core-perspective.js` = an *attention lens* (multi-wear, **already implemented**). **Decision:** the projection/attention-lens layer is formally named **Context View** in all schemas, contracts, and code; **"Capsule" is retained only as the founder-facing colloquial term** ("wearing a hat"). `memory_capsules` keeps its name as the storage table. This ends the collision without renaming a live table. Context Views are context-specific projections of the Twin (Marketing / Health / Relationship / Financial / Business); multi-wear + suppression stay as built.

**Fact ≠ hypothesis (the load-bearing Twin rule):** every Twin item carries `value · truth_grade · confidence · source · observed_at · valid_until · supersedes · consent_scope`. The Twin stores **both facts and hypotheses but never silently converts one into the other** — promotion from hypothesis → fact is an explicit, receipted transition (mirrors the memory `PROPOSED → CANONICAL` gate already in `memory-capsule.js`). This is the state-layer analogue of the eighth GRAIL field.

Steps (audit-first):
1. **Twin inventory + canonical definition:** map the ≥5 implementations; declare the canonical Twin = **Cognitive Core (how the person/org decides) + Memory (what is known)**; adopt the per-item schema above (`truth_grade`/`confidence`/`provenance`/`valid_until`/`consent_scope`); decide per product *consolidate vs. federate-behind-one-interface*. Likely an **adapter + migration layer**, not a rip-and-replace. *Spec → factory.*
2. **READS/WRITES contract (the standing rule):** every subsystem — Creative Engine, LifeOS, Oracle, Limitless, each office/renderer — **must declare what it READS from the Twin, what it WRITES directly, what it may only PROPOSE, and what is FORBIDDEN.** *This is the duplicate-state fix.*
3. **Context Views = projections:** formalize Context Views as scoped views of the Twin, each declaring readable fields / writable fields / propose-only fields / forbidden-sensitive fields / expiry / activation reason; keep multi-wear + suppression contracts (`config/judgment-capsule-contracts.js`).
4. **Alternative-futures simulation (extends the Phase-4 Decision Brief):** the Twin simulates not just a goal's cost but **alternative futures** (aggressive vs. specialist vs. small-business) and asks *which future matches the person's values* (read from the Twin), not which makes the most money.

**Enforceability:** the READS/WRITES contract is a deterministic gate (**fires-on-breakage:** a subsystem that touches Twin state without a declared contract fails CI; **passes-on-success:** a declared, contract-conformant subsystem passes). **Observer:** the contract registry is audited by a different office than the writer.

**Closed-loop anchor:** *GRAIL governs how reasoning happens · the Digital Twin stores what is known · Capsules decide what is relevant now · renderers decide how to communicate · Oracle decides whether it was correct · Reality updates the Twin.* One architecture, not several parallel systems.

## Phase 0 — Wire what already exists; charter what doesn't (no new capability yet)

**Why first:** the Self-Repair Tier-0→3 modules and the Cognitive Core Oracle are **built but not called by anything** — nothing is enforced until wired. And a plan named "enforceable" must start by proving the existing gates fire.

1. **Wire the 15 self-repair modules** into the live build/ship path (provenance ledger, root-cause chains, fix-durability, target-reputation, negative-knowledge, decision-log, pre-disk gate, sentry-canary, quarantine, failure-router, pattern-propagation, contract-gate, secret-deploy-gate, trust-dashboard, calibration-sampling). *Spec → factory.*
2. **Close the known governance holes:** (a) `claimPreExistingSatisfiedSteps` overclaims a "≥6 revive-failures" gate its code doesn't have — add the real gate; (b) ~~SO-003 fix~~ **CORRECTED 2026-07-20: this item was stale.** `services/chair-lumin-unified.js`'s direct-answer short-circuit was independently re-verified against live `origin/main` and found **already fixed** — commit `e71c1008c7` (2026-07-19 23:03, a full day before this document's own most recent revision listed it as still-pending). The direct-answer helpers now only populate `systemFacts.grounded_direct_answer` as grounding context; `translatePersonality` (the real, strong-model call) runs unconditionally, no exceptions, with the grounded fact preserved even through a total model-failure fallback. **Verified, not just read:** `tests/chair-lumin-unified-so003.test.js` (2 assertions) run live against current `origin/main`, both pass. **Enforcement status: `proven-live`.** Worth naming plainly: this document introduced the 8th field specifically to prevent stale "enforced" claims, and its own most recent revision still carried a day-stale unfixed claim about this exact bug — the fix for that class of error is independent re-verification against live code before each revision, not just carrying forward the last-known status.
3. **Write `docs/constitution/GRAIL_CHARTER.md`** = the rule table below, each row filled to all **eight** fields (incl. Enforcement status). This is the ratifiable artifact.
4. **Enforcement of Phase 0 itself:** pre-commit + CI must fail if a GRAIL rule lacks a fires-on-breakage or passes-on-success test (a linter over the charter). Observer: CI (deterministic), sampled by Chair.

**Exit test:** run every wired gate's fires-on-breakage + passes-on-success test in CI; green = Phase 0 done.

## Phase 1 — Truth & provenance (verify-the-factory AND verify-the-conductor)

Closes gaps #1, #2, #4 from the Unified Doctrine Map.

- **Provenance ledger live** for every load-bearing claim — **including reasoning/citation claims, not just commit-SHAs** (the dropped-citation failure mode). Each claim stamped KNOW/THINK/GUESS; **GUESS-grade barred from auto-merge.**
- **Deterministic where possible:** commit claims verified by `git merge-base --is-ancestor` (unrationalizable). Judgment claims verified cross-model.
- **Mechanism that exists:** machine-ship honesty gate (`system-commit-files.mjs` no-op detection) — extend from files to claims.
- **Observer:** the ledger is audited by a *different* office than the one that wrote the claim; overrides logged.

**Exit test:** a fabricated citation and a non-ancestor commit-sha are both blocked; a real citation + real ancestor pass.

## Phase 2 — The Reasoning Gate for creative needs (websites, videos, email, ads, posts)

This is how **organized creative needs** are handled. The Creative Engine is **one decision engine, many renderers** (SiteBuilder, SMOS video, email, ads). **Hard-gate the reasoning, not the behavior.**

- **Creative Intake Contract** (object required before any render): `mission · customer · journey_stage_current · journey_stage_target · primary_objection · evidence_required · trust_strategy · next_voluntary_action · success_metric`.
- **The concrete intelligence behind those fields (named, not generic — each is its own component):**
  - **Objection Model** — the unanswered objections (price / trust / time / risk / complexity / need / authority); `primary_objection` is *selected from* this model, not invented.
  - **Gap Engine** — "what isn't anyone saying?" (competitor / messaging / emotional / educational / trust gaps) → feeds `trust_strategy` and differentiation.
  - **Competitive Intelligence scoring** — score competitors on positioning / evidence / trust / differentiation / emotional appeal / authority / clarity (10-second test) / friction, then diff against the client.
  - **Confidence scoring** — measurable (expertise / evidence / social proof / transparency / guarantees / process clarity / risk reduction / presentation / cross-channel consistency) → e.g. "high authority, low reassurance."
  - **Visitor Question Coverage** — why-care / why-now / why-you / why-trust / what-next / what-risk / what-reward / how-much-effort must all be answered or the artifact isn't finished.
  - **Attention Architect** (constitutional office) — one job: *"has this earned the right to ask for the next thing?"* If no, it returns the work. This office **enforces L3 at the artifact level.**
- **Two enforcement layers:**
  1. **Presence check** (deterministic): render endpoint refuses if any field is empty. *Necessary but insufficient — a placeholder satisfies it (the "13 bugs" lesson).*
  2. **Coherence check** (cross-model, adversarial): does the objection follow from the journey stage? does the trust strategy address the stated objection? — the SENTRY-canary principle aimed at content.
- **All renderers consume the same gate.** A website, a video script, and an email each pass the same front door before generation spends a token.

**Fires-on-breakage:** an intake with fields filled by placeholder text ("mission: increase engagement") is blocked by the coherence layer.
**Passes-on-success:** a coherent intake renders.
**Observer:** the coherence checker is a different model family than the renderer (independence guarantee, gap #5).

## Phase 3 — Reality is the scoreboard, for creative (Law 1 made physical)

- Every rendered artifact ships carrying a **prediction** (CTR / watch-time / conversion / next-step completion) + **confidence**; the **real outcome is captured** and scored. Reuse the **Cognitive Core Outcome Oracle** (Murphy/Brier, e-value) + **calibration-sampling** — do **not** build a second scoreboard.
- **Decision Simulator** personas are allowed only as **Hypothesis-grade** until their scores are calibrated against real outcomes; an uncalibrated persona score may not gate spend. (Law 1 applied to the simulator itself.)
- **Taste / router weights update only when earned** (e-value ≥ threshold, n ≥ threshold) — same "recalibration is earned" rule already shipped.

**Fires-on-breakage:** an artifact published without a logged prediction is flagged; a taste-weight change with insufficient evidence is refused.
**Observer:** Oracle scores itself against reality; Chair samples.

## Phase 4 — The Laws as gates (voluntary progress, enforced)

| Law | Mechanism | Fires-on-breakage |
|---|---|---|
| **L1 Reality is the scoreboard** | prediction+outcome logging (Phase 3) | claim of success with no outcome receipt |
| **L2 People own their goals** | goal-override guard; identity models emitted as *hypotheses* only | system rewrites the user's stated goal |
| **L3 Earn the next step** | artifact declares one next-step mission; asks nothing beyond earned budget | a CTA that skips the journey stage |
| **L4 Influence without coercion — honor the "no"** | opt-out signal → re-pursuit of same ask **blocked**; **no upsell/referral/streak-shame overrides opt-out** | system re-asks after explicit opt-out |
| **L5 Build capability, not dependency** | dependency metric (usage that never graduates flags review) | a design that maximizes indefinite reliance |
| **L6 Progress happens in relationship** *(proposed)* | isolation/connection signal; system routes toward real people, never substitutes | system positions itself as the only relationship |

- **LifeOS coaching specifics:** three scores per interaction (**progress / engagement / emotional-cost**); **SO-003 — Enforcement status: `proven-live` (corrected 2026-07-20, see Phase 0):** the coaching/counsel channel's direct-answer short-circuit (`chair-lumin-unified.js`) is fixed — `translatePersonality` runs unconditionally, the direct-answer helpers only ground it. Verified live via `tests/chair-lumin-unified-so003.test.js`, both assertions passing against current `origin/main`. **Fires-on-breakage test (passing):** a counsel-class prompt that previously returned a template now reaches the strong model.
- **Decision Brief (simulate-before-commit):** **stakes-thresholded** per the Gate Charter — full brief only for irreversible / high-blast-radius goals (career, major finance, major health); a daily micro-step gets none (or it violates L3).
- **Companion:** *reality tells whether; dignity constrains how* — an artifact that wins on metrics but fails a dignity check is not adopted.

**Observer:** L2/L4 gates are deterministic (logged opt-out events) and sampled by the Empathy/Chair office; correlated failure avoided by keeping observer ≠ actor.

## Phase 5 — One substrate, two graphs

- **Constitutional Knowledge Graph** (company): unify today's flat tables (`self-repair-root-cause-chains`, the Unified Doctrine Map) into a queryable graph — principles as nodes, enforcement + domains as edges. Query by "which principles apply here," not by chat history (Adam's stated root problem: ideas trapped in conversations).
- **Life Graph** (per user) on the **same substrate**: Identity center; Health/Business/Relationships/Purpose/Learning edges that ripple. Cold-start from best general human-development evidence, personalize from reality.
- **Sequencing gate (consistency fix — same discipline Phase 7 now carries):** the Knowledge Graph's *table-unification* is substrate work (capture-first, allowed early), but the **graph query/traversal layer and the Life-Graph personalization are deferred until there is real query demand + per-user reality data to calibrate against.** Build the substrate; earn the query layer. Cold-start models stay Hypothesis-grade until reality data promotes them. (This closes the "P5 didn't get P7's evidence-gate" inconsistency.)
- **Guardrail (protects L2):** "kind of person who…" identity models are offered as hypotheses, never prescribed.

## Phase 6 — Offices not models · verify-the-verifier · self-pruning governance

Closes gaps #2, #3, #5.

- **Constitutional offices** (Architect/Builder/SENTRY/Oracle/Wisdom/Chair) decoupled from any model; **per-capability trust matrix** (domain × occupant) scored against reality → evidence-based delegation, provider-independent.
- **Verify-the-verifier:** the SENTRY chaos-canary runs on schedule and must catch a deliberately-broken SENTRY (gap #2). **Independence guarantee:** builder / grader / verifier must not share a model family where judgment is load-bearing (gap #5).
- **Self-pruning governance (§2.0G, gap #3):** a cadence job flags laws that stopped earning their keep (never fired, or high-latency/low-value) for **demotion/retirement** via the `gate-change` council path — governance conserved, not accreted.

## Phase 7 — Compounding & Path to First Compounding Dollar

- **Revenue triage** ranked by **time-to-revenue × institutional learning × ecosystem leverage × long-term compounding**, computed on the same Tier-0 primitives (reputation / pattern-propagation / decision-log) pointed at **customers** instead of code targets.
- **Cross-product immunity:** a fix or lesson in one product propagates across the shared substrate (pattern-propagation), so a win in SiteBuilder makes SMOS/LifeRE/LifeOS smarter automatically.

---

## Sequencing discipline (non-negotiable, learned today)

**Capture before routing before gating before dashboards.** Do not build the exciting visible layer (Institutional Taste, forecasting, ROI-gated spend, Decision Simulator UX) before the substrate that can *prove* any of it is real. By Law 1's own logic, an uncalibrated layer is Hypothesis-grade — build the boring capture first (Phase A per-job logging + Phase 0–1 provenance), then earn the rest.

## Explicitly deferred (named, not silently dropped)

Discussed tonight, **intentionally not yet phased** — each with the reason, so nothing is lost:

- **Oracle market-watch** (weekly trend / threat / opportunity scan) — deferred until it can pass the **Zero-Waste AI Call Rule** (a `workCheck`, not a calendar trigger), or it burns tokens on reports nobody pulled.
- **Institutional Taste** — deferred until **Phase-3 calibration data exists**; must cash out as a *falsifiable learned weighting* over Creative-Genome dimensions scored against real outcomes, or it's a vibe.
- **Plain Sight Reports / Opportunity Radar** — deferred; both are Oracle outputs that depend on the market-watch substrate above.
- **Creative R&D Queue** ("what would have to become true?") — deferred to after Phase A; decompose "impossible" into missing-capability + trigger-signals + expected-value.
- **Path to First Compounding Dollar as an *active* triage gate** — Phase 7 defines it; live enforcement deferred until Tier-0 customer data exists.

## Coverage map (every tonight-topic → where it lives)

| Tonight's topic | Home |
|---|---|
| Media Router / Creative Genome / Generate-Once | **Phase A** |
| Negative-render KB · predict-before-spend | **Phase A** (gates) |
| Digital Twin as canonical state (audit ≥5 fragmented impls) · READS/WRITES contract · alternative-futures sim | **Phase B** |
| Capsules as Twin projections (multi-wear already live) · resolve `memory-capsule` vs `perspective` naming | **Phase B** |
| Wire built-but-unwired self-repair + revive-gate hole | **Phase 0** |
| Provenance incl. reasoning-citations · verify-the-conductor | **Phase 1** |
| Hard-gate-the-reasoning · Creative Intake Contract | **Phase 2** |
| Objection Model · Gap Engine · Competitive Intel · Confidence scoring · Visitor Qs · Attention Architect | **Phase 2** (named) |
| Reality-is-scoreboard for creative · Decision Simulator | **Phase 3** |
| Six Laws as gates · honor-the-no · SO-003 coaching · Decision Brief · 3 coaching scores | **Phase 4** |
| Constitutional Knowledge Graph · Life Graph | **Phase 5** |
| Offices-not-models · capability matrix · verify-the-verifier · self-pruning governance | **Phase 6** |
| Path to First Compounding Dollar · cross-product immunity | **Phase 7** |
| Oracle market-watch · Institutional Taste · Plain Sight · Opportunity Radar · Creative R&D Queue | **Deferred (with reasoning)** |

## Operating offices (permanent roles, not rotating builders)

The advantage of three capable systems is **not 3× code — it is independent reasoning, independent implementation, and independent verification** so no single model designs, builds, tests, and declares itself correct. Roles (ratified-in-practice this session; formal ratification per below):

| Office | Holder | Mandate | Must NOT |
|---|---|---|---|
| **Architect + adversarial reviewer** | Cursor/Opus (this office) | contracts, threat model, conformance audit of shipped diffs | hand-build load-bearing modules (SO-001); repair its own findings in the audit pass |
| **Implementation Conductor** | Claude Code | convert ratified architecture → bounded factory build-specs; route builds through the governed factory; confirm SENTRY independence; assemble results; route verified defects back for repair; prove phase exit criteria | hand-author load-bearing production modules where SO-001 requires factory construction; verify its own judgment claims; promote its own work to `proven-live` |
| **Integration investigator + black-box acceptance** | Devin *(activate only if live — do not assume)* | choke-point map, client-readiness, journey tests | design contracts |
| **Disagreement resolver** | Chair / Council | compare independent outputs, surface contradictions | build or test |
| **Human Guardian** | Adam | goals, values, risk, ratification | — |

**Three honest caveats from the adversarial-reviewer seat (applied to this proposal itself):**
1. **Residual correlation:** if the Architect authors the contract *and* audits conformance to it, that pair isn't fully independent — it only checks "impl matches my design," not "the design was right." The contract's **correctness** must be attacked by an uncorrelated office (Devin black-box + Chair). This is Phase-6 gap #5 (builder/grader/verifier must not share a model family where judgment is load-bearing) — name it explicitly, don't assume the office labels alone guarantee it.
2. **Don't assume Devin is a live operator.** KNOW: Cursor/Opus + Claude Code are active this session. Devin's current operational status is **DON'T KNOW** — the structure is sound but its activation is fail-closed until confirmed; until then Chair black-box + SENTRY carry the acceptance role.
3. **Compress the contract phase.** Writing eight contracts before one working slice risks the plan's own "prove the substrate before the visible layer" rule. Write the **minimum** contract the one LifeOS slice needs (Twin item schema + read/write + Context View + experiment), prove the slice, then generalize the remaining contracts *from what the slice taught.*

**Independence is earned, not assumed (Phase-6 mechanism):** offices are permanent; **occupants earn continued authority.** Combine stable primary offices + **rotating secondary observers** + **planted independence canaries** — periodically feed an assigned observer a deliberately-flawed artifact and measure whether it catches it; repeated misses lower that occupant's trust score for that capability. The office is permanent; the occupant is not guaranteed.

## Planning Sufficiency Gate (planning answers to "reality is the scoreboard" too)

Planning can improve forever; it must **stop** when *enough architecture exists to prevent foreseeable damage* — not when all uncertainty is gone. Planning stops and the first slice begins when all are true:
1. the problem is bounded
2. current reality is sufficiently verified (no rediscovery)
3. the target behavior is clear
4. the first vertical slice is selected
5. its fires-on-breakage + passes-on-success tests exist
6. ownership is assigned
7. no unresolved disagreement blocks *the first slice* (open questions about the eventual full system are not blockers)

**Status (2026-07-20): GATE PASSED** — all seven met; see `docs/FIRST_SLICE_CONTRACT.md`. No further full-system architecture rounds before the first slice ships a receipt.

## Ratification & authority

- This plan is **pre-Article-VII**. Promoting GRAIL (or any Law, incl. L6) to constitutional law requires **§2.12 council debate + Article VII (unanimous AI Council vote + Human Guardian written approval + 7-day review)**.
- Until ratified + wired, GRAIL rules are enforced **only to the degree Phase 0–1 actually built the gate** — and every claim of "enforced" is itself a Phase-1 provenance claim (recursive by design).

## Definition of done (per phase)

A phase is **COMPLETE** only when its fires-on-breakage and passes-on-success tests are green in CI **and** an independent observer (SENTRY / a different office / deterministic check) has confirmed it — receipted. Otherwise: **NOT COMPLETE**, with one named blocker (§2.17). No third state.
