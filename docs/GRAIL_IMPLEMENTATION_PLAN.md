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

A rule missing any field ships as **candidate**, not law. This is the whole difference between GRAIL and "nice words."

---

## Phase 0 — Wire what already exists; charter what doesn't (no new capability yet)

**Why first:** the Self-Repair Tier-0→3 modules and the Cognitive Core Oracle are **built but not called by anything** — nothing is enforced until wired. And a plan named "enforceable" must start by proving the existing gates fire.

1. **Wire the 15 self-repair modules** into the live build/ship path (provenance ledger, root-cause chains, fix-durability, target-reputation, negative-knowledge, decision-log, pre-disk gate, sentry-canary, quarantine, failure-router, pattern-propagation, contract-gate, secret-deploy-gate, trust-dashboard, calibration-sampling). *Spec → factory.*
2. **Close the known governance hole:** `claimPreExistingSatisfiedSteps` overclaims a "≥6 revive-failures" gate its code doesn't have — add the real gate. *Spec → factory.*
3. **Write `docs/constitution/GRAIL_CHARTER.md`** = the rule table below, each row filled to all seven fields. This is the ratifiable artifact.
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

- **LifeOS coaching specifics:** three scores per interaction (**progress / engagement / emotional-cost**); **SO-003** enforced by the model-routing gate (the coaching channel may **never** be served a cheap-tier or canned response).
- **Decision Brief (simulate-before-commit):** **stakes-thresholded** per the Gate Charter — full brief only for irreversible / high-blast-radius goals (career, major finance, major health); a daily micro-step gets none (or it violates L3).
- **Companion:** *reality tells whether; dignity constrains how* — an artifact that wins on metrics but fails a dignity check is not adopted.

**Observer:** L2/L4 gates are deterministic (logged opt-out events) and sampled by the Empathy/Chair office; correlated failure avoided by keeping observer ≠ actor.

## Phase 5 — One substrate, two graphs

- **Constitutional Knowledge Graph** (company): unify today's flat tables (`self-repair-root-cause-chains`, the Unified Doctrine Map) into a queryable graph — principles as nodes, enforcement + domains as edges. Query by "which principles apply here," not by chat history (Adam's stated root problem: ideas trapped in conversations).
- **Life Graph** (per user) on the **same substrate**: Identity center; Health/Business/Relationships/Purpose/Learning edges that ripple. Cold-start from best general human-development evidence, personalize from reality.
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

**Capture before routing before gating before dashboards.** Do not build the exciting visible layer (taste, forecasting, ROI-gated spend, Decision Simulator UX) before the substrate that can *prove* any of it is real. By Law 1's own logic, an uncalibrated layer is Hypothesis-grade — build the boring capture first (Phase 0–1), then earn the rest.

## Ratification & authority

- This plan is **pre-Article-VII**. Promoting GRAIL (or any Law, incl. L6) to constitutional law requires **§2.12 council debate + Article VII (unanimous AI Council vote + Human Guardian written approval + 7-day review)**.
- Until ratified + wired, GRAIL rules are enforced **only to the degree Phase 0–1 actually built the gate** — and every claim of "enforced" is itself a Phase-1 provenance claim (recursive by design).

## Definition of done (per phase)

A phase is **COMPLETE** only when its fires-on-breakage and passes-on-success tests are green in CI **and** an independent observer (SENTRY / a different office / deterministic check) has confirmed it — receipted. Otherwise: **NOT COMPLETE**, with one named blocker (§2.17). No third state.
