<!-- SYNOPSIS: Chair research packet + two-factory run directives, 2026-08-11, with honest build status per item. -->

# Chair research directives — 2026-08-11

Two inputs arrived together: the Chair's assessment of the two-factory run, and a research packet of ~70 architectural ideas drawn from 2026 multi-agent, memory-security, delegation and generative-UI literature.

This document exists so the difference between **enforced by a machine**, **recorded as doctrine**, and **not started** stays visible. The BuilderOS failure being guarded against is the one already found live five times: a mechanism that claims enforcement while having no caller. A law written here and not wired anywhere is doctrine, and it is labelled doctrine.

Status vocabulary:

- **ENFORCED** — a deterministic check fails closed, with a test that proves the refusal.
- **PARTIAL** — the mechanism exists but does not yet cover the stated intent.
- **DOCTRINE** — recorded, agreed, not built. No code depends on it.

---

## Part 1 — Directives from the two-factory run

These came from the Chair reviewing what the run exposed: capacity truth, execution truth, and blueprint truth.

| # | Directive | Status | Where |
|---|---|---|---|
| 1 | Every plan reports maximum theoretical parallelism, effective parallelism, critical-path floor, expected speedup — before work begins, so factory count can never become a vanity metric | **ENFORCED** | `parallelismMetrics()` in `scripts/plan-topology.mjs`; `parallelism` is a required plan field, so a plan without it is refused |
| 2 | A factory is healthy only if it proves, every time it comes online, that it can mutate its own workspace, run its own verification stack, and *fail* to mutate a peer | **ENFORCED** | `scripts/factory-health-audit.mjs`; `allocate()` refuses assignment without a `HEALTHY` proof, fail-closed when no proof exists |
| 3 | Dependency graph independently topologically validated from the frozen source; a strongly connected component larger than one node fails authorization unless declared with a lawful iterative execution contract | **ENFORCED** | `findCycles()` (Tarjan) + `UNDECLARED_DEPENDENCY_CYCLE` / `CYCLE_MISSING_ITERATIVE_CONTRACT`, validated against `blueprint.steps`, not against the plan's own slices |
| 4 | Coverage assertion: every source step appears exactly once in {scheduled, blocked, cyclic, rejected}. 16 in, 16 accounted for | **ENFORCED** | `accountForSteps()`; `SOURCE_COVERAGE_INCOMPLETE` refuses the plan. This is the invariant that catches the tidy eleven-step report |
| 5 | Scheduler optimizes makespan, not instantaneous utilization: a slice feeding a long chain is dispatched ahead of a cheaper independent slice | **ENFORCED** | `criticalPathDepth()` orders every wave; tested by asserting the chain head is dispatched before the cheap independent slice |
| 6 | Founder schema answers frozen into a Schema Decision Artifact with provenance and hash, consumed identically by both factories | **ENFORCED** (mechanism) / awaiting answers | `scripts/schema-decision-artifact.mjs`; artifact currently `AWAITING_FOUNDER` with 7 unanswered stores. Divergent citation is caught as specification divergence, not builder divergence |
| 7 | The cycle is architectural: it routes to Architect/Presiding Steward, never resolved by a builder choosing an order that happens to run | **PARTIAL** | Authority routing is enforced (`PLAN_DEFECT_AUTHORITY` → `architect`). The Chair also wants builders able to *propose* candidate repairs; no proposal channel exists yet |
| 8 | Blocked-by-Origin on every blocked slice: founder decision, architecture, manufacturing plan, environment, tooling, or builder execution | **ENFORCED** | `BLOCKER_ORIGIN` in `scripts/plan-topology.mjs`; the Overlay plan currently reports **11 founder decision, 5 architecture, 0 anything else** |

### What #8 says about the current state

> "That makes it impossible for someone later to blame 'slow factories' for a blueprint that literally cannot execute." — Chair

Every blocker on the Overlay is upstream of manufacturing. Nothing is blocked on factory capacity, factory health, tooling, or builder execution. The factories proved that adding execution capacity would not solve the actual problem.

---

## Part 2 — The most important research finding

The Chair's lead item is that we may be **underestimating the two-factory architecture**, and that 2026 multi-agent research on **diversity collapse** shows the naive version backfires: adding cooperating agents can *reduce* intellectual diversity, because strong agents talking densely converge prematurely and authority-heavy structures suppress dissent.

Two laws follow, and both are now mechanical.

### Law: independence before consensus — **ENFORCED**

Required order: **freeze evidence → independent analysis → seal → reveal → disagreement analysis → consensus.** Not: everyone enters a room and starts talking.

`compareRedundantResults()` voids any comparison where a lane saw a peer result before sealing its own, including the case where nobody admits it but the timestamps show sealing after reveal. An echo that agrees is the most convincing worthless evidence available.

### Law: agreement is evidence only in proportion to independence — **ENFORCED**

> "Two independent factories using the same flawed library aren't two proofs. They're one failure duplicated." — Chair

`config/independence-factors.js` computes **effective perspectives** across model lineage, prompt perspective, dependency tree, retrieval sources, test suite, runtime, architecture interpretation, and prior exposure to the peer. Unknown factors count as *shared*, because "we never checked whether these two could fail together" is not evidence that they can't.

**This immediately indicted something built the same evening.** factory-2's dependency tree is a symlink to factory-1's — chosen deliberately to make the lane healthy without a second install. It was the right call for speed and it is a genuine correlated-failure channel: any defect originating in a shared package is reproduced identically in both lanes, so their agreement about it carries no information. Effective perspectives for the two lanes as currently configured: **1.0**. Their convergence now reports `not_raised_correlated_failure_risk` rather than raised confidence.

One correction made while implementing: the threshold is a *ratio* (0.75 of participant count), not an absolute "2 effective perspectives". Requiring N effective perspectives from N agents demands perfect orthogonality, which no two real lanes have — they share a runtime and a repository at minimum — so an absolute threshold would have made corroboration permanently unreachable and the gate would have been ignored within a week.

---

## Part 3 — Research packet, recorded as doctrine

All items below are **DOCTRINE**: agreed direction, no enforcement, no caller. Grouped by the mechanism they belong to. Chair's caveat preserved: he cannot prove nobody has thought of these, only distinguish productized from research-stage from apparently-unassembled.

### Consensus and cognition
- **Measure the shape of disagreement** — not "A says yes, B says no" but *why*: same evidence different conclusion, different evidence, different assumptions, different reading of law, different predicted future, different values. Each demands a different resolution mechanism. Today's Consensus Protocol has fixed steps and no taxonomy.
- **Diversity budget** — a Council states how many genuinely independent perspectives a decision *requires*, so the Presiding Steward can say "six votes, 2.1 effective perspectives". The measurement now exists; the requirement does not.
- **Counterfactual factory** — a third lane that builds nothing and answers "what would have happened if we had done this differently", surfacing the assumptions that would make the chosen architecture regrettable.
- **Future-regret score / option value** — before irreversible decisions, generate structured failure worlds (regulation changed, vendor vanished, cost exploded, scale ×1000, attack succeeded) and credit architecture for *cost of changing our mind*, not only present performance.
- **Unknown-unknown hunting** — a separate role from adversarial review: adversarial review attacks known dimensions, this searches for missing dimensions.

### Memory (treated as a security surface)
Memory poisoning is now a live attack class: malicious content planted via webpages or documents that a later agent treats as trusted history. The Twin is more valuable than ordinary chatbot memory and therefore more dangerous.
- **Memory admission gate** — nothing enters durable memory merely because a model saw it. Every candidate carries source, speaker, timestamp, confidence, sensitivity, verification state, decay, contradictory evidence, explicit-vs-inferred, and possible adversarial origin. Web content essentially never writes durable human truth.
- **Memory quarantine — three zones**: Observed ("we encountered this"), Provisional ("may be true"), Trusted ("safe enough to influence consequential decisions"). A malicious page can create *"observed claim: Adam changed his bank account"* and cannot create *"Adam's bank account changed."*
- **Memory lineage** — every memory answers "why do you believe this?", walkable backward: decision ← inference ← memory ← source ← observation. A knowledge supply chain.
- **Revocation propagation** — when a source is invalidated, find everything derived from it and mark it contaminated. Referential integrity for beliefs.
- **Belief version control** — store the history (unknown → weak inference → explicit confirmation → contradictory behavior → changed), because humans change.
- **Separate identity from preference from state** — enduring facts vs general preference vs what they want right now. "Usually likes detail" + "currently driving" = concise. Most personalization collapses these.
- **Evidence expiration and freshness-weighted certainty** — stock price decays in seconds, a birthday effectively never. Certainty should be evidence confidence × freshness × source reliability.

### Authority and delegation
- **Authority envelope travels with the task** — principal, objective, spend cap, geography, expiry, may-reserve, may-prepay, may-delegate, may-modify-calendar. An agent cannot acquire authority just because its delegator had it.
- **Attenuation only** — every hop maintains or reduces authority, never silently expands it. Capability security applied to personal AI.
- **Execution-count and purpose-bound permissions** — "≤$500 once", "until Friday", "only while this workflow exists"; and "may search Gmail for hotel confirmations for *this* itinerary", not "can access Gmail". Authority dies automatically.
- **Proof-of-delegation / Agent Passport** — cryptographically prove "I am an agent, I represent Adam, he authorized this class of transaction, authority expires at X, here is the auditable chain" — safer than impersonating a human clicking a browser.
- **Task-specific, dynamically decaying trust** — an agent can be an excellent researcher and a terrible financial executor; trust resets partially on model version change and decays with disuse. Trust as a continuously calibrated prediction, not a badge.

### Skills, learning, autonomy
- **Skill evolution over template storage** — experience → lesson → skill → verification → promotion. A template says "do these steps"; a skill says "here is the generalized strategy and when it applies".
- **Abstraction ladder and inheritance** — instance → procedure → skill → general capability, so a new website inherits "account profile modification" instead of learning from scratch.
- **Failure creates curriculum** — repeated failure on modal dialogs during checkout automatically generates adversarial practice on modal dialogs. Self-improvement with direction.
- **Synthetic edge-case factory** — mutation testing for agent behavior: network failure, renamed button, session expiry, price change, ambiguous person, malicious instruction, partial success.
- **Competence frontier, both directions** — proven / likely / experimental / unknown gates autonomy per skill; and model the *human's* competence by domain so assistance adapts.
- **Progressive disappearance vs progressive automation** — for skills the human wants, success makes the assistant less visible until it is unnecessary; for work they hate, automation increases to autonomous. Every task carries a direction. This inverts the industry incentive to optimize dependence.
- **Shadow execution and counterfactual shadowing** — predict without acting, compare to what the human did, promote on agreement plus Reality success, and keep sampling afterward so behavioral drift contracts autonomy automatically.
- **Reversible autonomy** — classify by recoverability, not only risk. Higher autonomy where rollback exists.

### Attention, intent, presentation
- **Attention as a scarce resource with a price** — every interruption carries an estimated attention cost; interrupt only when expected benefit exceeds it. A $3 saving does not; a $3,000 mistake does. Low-value items accumulate and compress into a 20-second summary.
- **Learn when *not* to help** — an intervention model for when assistance is welcome versus intrusive. The best assistant may distinguish itself through restraint rather than intelligence.
- **Intent half-life and goal inheritance** — "find me a house" persists for months, "I want pizza" for 45 minutes; and subgoals die with their parent unless separately retained. Cancelled trip kills the hotel search.
- **Negative goals** — what must never happen, with stronger persistence than ordinary preferences.
- **Goal contradiction detection** — save money and buy premium, work less and earn more: detect and simulate the trade-off rather than silently optimizing one.
- **Opportunity discovery without execution authority** — continuously ask what opportunity exists that was never requested, emit an Opportunity object, rank by expected value minus attention cost. Discovery grants no authority to act.
- **Presentation DNA, learned behaviorally** — an April 2026 generative-UI study found low inter-designer agreement about what a good interface is, and lightweight preference learning beat direct prompting. So learn density, visual-vs-textual, choice count, explanation depth, animation tolerance from behavior (completion speed, errors, backtracking, dismissals) rather than asking. Two people requesting the same capability get different but stable interfaces.
- **Regret-aware presentation** — expected outcome, worst credible outcome, reversibility and regret potential change how a choice is presented.

### Privacy
- **Minimum necessary context** — a Context Compiler strips everything a model does not need for this exact job. A model booking dinner does not need financial records.
- **Privacy transformations, not binary sharing** — exact value, range, category, anonymous identifier, derived fact, or proof without disclosure. The service usually needs `over_50 = true`, not a date of birth.
- **Local privacy broker** — a small trusted local component whose job is information control, not intelligence: redact, abstract, minimize, label provenance, then transmit. A moat independent of which models we use.

### Runtime supervision and execution
- **Cheap local watchdog supervising the expensive actor** — a recent AgentGUI result reports up to 34-point completion gains from automated drift prevention. Watch for goal drift, repetition, unexpected domain changes, authority-boundary approach and injection; wake the expensive reasoner only when needed.
- **Actor separate from watchdog** — the agent doing the work is not solely responsible for noticing its own drift. Separation of powers extended into runtime.
- **Batched micro-actions with dynamic granularity** — batch deterministic safe segments into one turn; batch less as risk rises, down to one action per verification.
- **Execution compiler** — compile a semantic micro-plan once, then translate per device to API calls, DOM operations, accessibility actions, CLI or pixels. An LLVM for agent actions.
- **Cross-device continuation** — one persistent interaction object: start on desktop, authenticate on phone, approve on watch, hear the result in the car. Not five assistant sessions.
- **Human handoff compiler and friction accounting** — when automation stops, compile the remainder into the smallest possible human action ("everything is done except this CAPTCHA"), and measure human effort saved (clicks, typing, decisions, waiting, phone time) as a Reality metric.
- **Capability economics** — per capability: cost per success, latency, human attention cost, failure rate, risk exposure. Then route economically: API 4¢ at 99.8%, GUI 31¢ at 91%, human handoff 90 seconds. Weighted by a personal value-of-time that is contextual, not a fixed hourly rate.

### Decision quality
- **Decision receipts** — what we knew, what we didn't, which assumptions mattered, why this was chosen, confidence, alternatives rejected. Later, Reality compares outcome against the receipt, distinguishing a bad decision from a good decision with an unlucky outcome.
- **Calibration by decision class** and a **prediction ledger** — what does our "80%" actually mean in software architecture versus sales forecasting? Recorded to learn calibration, not to punish agents.
- **Assumption ledger, architectural tripwires, self-expiring architecture** — decisions record their assumptions ("Android permits X", "latency <300ms", "API volume below 10M/day"); crossing a threshold reopens the decision *before* it breaks; temporary workarounds carry review dates so technical debt stops becoming immortal by accident. This turns documents from static records into living decisions.

### Product philosophy
- **Anti-addiction metric and independence metric** — engagement, session time and daily actives are worth zero unless they correlate with human benefit, and unnecessary interaction may be penalized. Success can look like "Adam didn't open it all day because everything worked."
- **Constitutional metric firewall** — classify every metric as human outcome, operational, diagnostic, or *forbidden optimization target*, so engagement metrics cannot be reintroduced later. The vanity-metric law generalized to the product itself.

---

## Part 4 — The Human–AI Contract

The Chair's candidate for the real moat: not Terms of Service but a machine-readable living agreement between one person and their intelligence — what to optimize for, what never to do, when interruption is allowed, which decisions require the human, what may be learned, what must be forgotten, who else may access what, what risk is tolerated, what autonomy has been earned, what must always remain human.

Every agent, tool, UI, factory, model and external service then operates downstream of that contract.

> "Don't merely authenticate that an AI acts for a human. Make it possible to prove that the AI is acting within the relationship that human deliberately established with it."

Status: **DOCTRINE.** It connects the existing pieces — Twin knows the human, Constitution limits the system, Authority defines permission, Sentry protects boundaries, Presiding Steward governs consequential decisions, Solomon holds evidence and foresight, Factories manufacture verified capability, Reality decides whether it worked, Fluid UI presents it, TemplateStore turns experience into execution — and answers the question none of them answer alone: for whose benefit, under whose authority, and according to whose boundaries is all of this operating?

The Chair's assessment of the competitive position: models, computer use, agent protocols and generative UI are commoditizing quickly; the durable moat is a trustworthy, continuously learning relationship that can prove why it knows something, why it acted, who authorized it, what happened, and whether the human actually benefited. He found the pieces scattered across the research and no one who appears to have assembled the whole.
