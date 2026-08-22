<!-- SYNOPSIS: Architecture review for PRODUCT-SOCIALMEDIAOS-FIRST-PAID-CREATOR-0001 (Abbott execution) -->

# SocialMediaOS BP Architecture Review

## Sources reviewed
This review reconciles the current SocialMediaOS/MarketingOS product homes and manifests, available product conversation archives, the 2026-06-29 founder ecosystem/producer-director session, the 2026-07-20 Creative Engine/Voluntary Progress synthesis, the 2026-08-01 SMOS revenue-loop archive, current pricing configuration, current Creative Engine code, current coaching/content generation code, and current verification scripts.

## What the product already is (do not rebuild)
- Canonical parent/module relationship: MarketingOS -> SocialMediaOS.
- Customer creator loop exists: consent/session/coaching/extraction/generation/approval/export.
- A current live Phase-1 verifier exists and exercises the text-mode loop.
- Current one-time commercial wedge: $49 content pack.
- Ratified but not-yet-live recurring tiers: Pro $59/mo, Studio $159/mo, Studio Plus $459/mo; card-required trial/credits/consent model is specified but must not be sold as live before implementation/proof.
- Creative Engine exists with footage editing, smart editing, photo polish, script compose, graphic design, competitor analysis and social publish modes.
- YouTube intelligence and format-native platform doctrine exist in product history.
- Connect/publish work and live-publish kill-switch doctrine exist.
- Ownership/payment bugs have previously been found and corrected; entitlement/session scoping is a first-class requirement.

## Founder vision already captured but under-implemented
These are not new ideas; they are existing founder/product direction that should remain in future BPs.

1. **Producer/director, not generator** — coach the human through shots, lighting, sound and redo until source quality passes.
2. **One Creative Engine, many renderers** — shared judgment layer for video/social/site/email/graphics/coaching.
3. **Earned attention / next voluntary step** — every communication earns the next amount of attention/trust rather than jumping to a final conversion ask.
4. **Reason before render** — Mission, Customer, journey stage, objection, evidence, trust strategy, next voluntary action and success metric should exist before media generation.
5. **True-cost representation** — expose DIY/app-guided, AI-assisted and external-production tradeoffs; explain why a higher cost is worth it.
6. **Reality feedback loop** — learn from actual retention, engagement, leads, revenue and failed creative decisions; generated recommendations remain hypotheses until measured.
7. **Cross-client learning** — Curaytor-Brain-like pattern learning across clients with privacy/governance boundaries.
8. **Video-first advantage** — do not collapse into generic scheduler/caption-tool parity.
9. **B-roll compounding** — consented tagged footage becomes a reusable client asset library.
10. **Platform-native outputs** — Instagram/TikTok/LinkedIn/YouTube each require native creative rules; no blind reposting.
11. **Referral/relationship engine** — adjacent professionals become collaboration, client and referral channels; real-estate EXP recruiting is a specific founder-use lane.
12. **Attention/authority memory** — contradictions, past positions, failed hooks and winning creative patterns should inform future content.
13. **Integrate first, replace later** — use best external tools, measure them, and replace only when internal capability is better/faster/cheaper enough.
14. **AI Marketing Director framing** — the user should interact with a capable role/team, not a cockpit of disconnected software features.
15. **Physical/local marketing extension** — print/stickers/QR/local assets with true landed cost belong in MarketingOS, not as an unrelated product.

## Current gaps that made the old BP incomplete

### Gap A — verification drift
`scripts/verify-socialmediaos.mjs` is stale, mislabeled, and references the wrong repository. A product cannot be trusted while its canonical verifier can prove the wrong system.

### Gap B — runtime isolation drift
The founder A-to-Z runner contains no guard against an accidental Costello default runtime. Any Abbott mission must fail closed instead of silently proving another runtime.

### Gap C — product loop and Creative Engine are not one coherent decision system
Current coaching/content-generation code can produce a pack from five answers, but the founder's Creative Brief reasoning contract is not a hard prerequisite. The mission/customer/stage/objection/trust/next-action logic exists primarily as doctrine/brainstorm, not an enforced SocialMediaOS artifact.

### Gap D — producer/director behavior is still mostly vision
The existing coach gathers stories/positioning but does not yet behave as the full production director: shot list, lighting/audio checks, source-quality scoring, redo criteria, capture guidance and transparent production options.

### Gap E — product readiness vs. revenue proof are conflated
A human choosing to purchase cannot be fabricated by the factory. Acceptance needs separate states: PRODUCT_READY_FOR_PAID_CREATOR versus FIRST_PAID_CREATOR_PROVEN.

### Gap F — continuity test was previously weak
The handoff executor could complete multiple slices in one process. `one_slice_per_run` is now required so the supervisor must genuinely redispatch after a successful slice.

### Gap G — manifests lag reality
Older MarketingOS manifest fields still describe planning/pre-build and old blockers despite later product history showing live customer/revenue surfaces. A future governance cleanup BP should reconcile manifests after runtime truth is proven; this mission should not waste slices rewriting documentation before product acceptance.

## Ideas I believe are still missing or need stronger definition
These are **architecture proposals**, not claims that the founder already specified them exactly.

### 1. Creative Proof Ledger
Every factual/credibility claim used in content should carry provenance: founder statement, customer-approved testimonial, public source, measured business outcome, or explicitly unverified hypothesis. This would make "never invent proof" mechanical and let the Engine prefer stronger evidence over louder copy.

### 2. Cost per Voluntary Next Step
Do not optimize only CPM/views/engagement. Track total creative cost (human time + AI/render spend + paid distribution) divided by meaningful next steps: qualified watch depth, profile visit, reply, booked call, lead, purchase, referral. This joins the founder's true-cost doctrine with earned attention and business results.

### 3. Creator Capability Score
If the doctrine is "build capability, not dependency," SocialMediaOS should measure whether the human is becoming better at hooks, delivery, lighting, framing, storytelling and calls-to-action. The producer/director can progressively ask less as the creator improves. That makes the philosophy measurable rather than inspirational.

### 4. Evidence-weighted Creative Memory
Store not just "winning posts" but why they may have won: audience state, hook type, source evidence, platform, creative format, spend, distribution context, retention curve and downstream revenue. Avoid cargo-culting a post that succeeded for unrelated reasons.

### 5. Experiment Contract
For important content, define hypothesis, variable changed, control/baseline, expected signal, minimum observation window and stop condition. This turns A/B testing into learning rather than endless variant generation.

### 6. Distribution Relationship Graph
The roadmap has referral partners, collaborators, superfans and recruiting. A unified relationship graph could rank distribution paths by trust and mutual value: who can credibly share this, who has adjacent audience overlap, what relationship already exists, and what next voluntary interaction is appropriate. This is more defensible than raw follower counts.

### 7. Revenue Attribution With Confidence
Connect content -> interaction -> lead -> opportunity -> transaction where evidence allows, but assign confidence when attribution is indirect/dark-social. Do not claim a post "made $X" when the evidence only says it likely contributed.

### 8. Content Portfolio Risk / Reputation Guard
Before publish, check for contradictions with prior stated positions, compliance risk, overused claims, audience fatigue, brand mismatch and excessive dependence on one platform. The existing Authority Map idea should become an actual pre-publish risk service.

### 9. First-Party Audience Escape Hatch
Every social strategy should include a path from rented platform attention to a consented first-party relationship (email, SMS where opted in, community, customer account, event, consult). The anti-algorithm-backup idea exists; the missing piece is making it a default measurable journey target rather than a later feature.

### 10. Business Outcome Brief, not Content Calendar
For each period, the user should state business outcomes and constraints (appointments, listings, recruiting, local authority, product launch, retention) and let the AI Marketing Director derive the content portfolio. This keeps the product from turning into a prettier posting calendar.

## Why BP1 stays narrow
BP1 implements only the minimum missing decision/director spine needed to make the existing paid creator loop coherent and to test Abbott's continuation. Recurring billing, cross-client learning, full autopublishing, trend radar, B-roll compounding and distribution graph are intentionally future BPs so failure in any one of those domains does not obscure whether Abbott can execute continuously.

## Recommended post-BP1 sequence
1. Recurring subscription/trial/credit-meter revenue engine.
2. Outcome capture + Creative Proof Ledger + experiment contract.
3. Cross-client Creative Intelligence Brain with privacy boundaries.
4. Platform-native publish/measure/learn loops.
5. Producer-director video capture + B-roll compounding at full fidelity.
6. Relationship/referral/recruiting distribution graph.
7. Provider Observatory / build-vs-buy replacement oracle.
