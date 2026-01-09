SSOT ANNEX — TOTALCOSTOPTIMIZER (TCO)
Version: 2026-01-08
Status: Canonical Annex (referenced by North Star; does not override Constitution)

Purpose:
List concrete mechanisms + product systems that produce verified savings WITHOUT meaning drift and WITHOUT compute overhead erasing gains.
This annex is written so any bot/LLM can operate with minimal prior exposure.

Anti-Hallucination Rule:
If an item is not verified in code/production, label it as PLANNED. Never describe PLANNED items as live.

Fields:
- ID: stable identifier
- STATUS: LIVE | IN_BUILD | PLANNED
- TYPE: SAVINGS | QUALITY | SAFETY | OVERHEAD | PROOF | GROWTH | PRICING | COMPLIANCE
- MECHANISM: what it does (1–2 lines)
- METRIC: how we prove it worked
- RISKS: drift/abuse/privacy/UX risks

============================================================
A) TOKEN + CONTEXT REDUCTION (SAVINGS MECHANISMS)
============================================================

TCO-A01 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Session dictionary learning (customer/workspace vocabulary → short codes).
METRIC: token reduction % + unchanged quality score.
RISKS: dictionary drift; requires versioning + rollback.

TCO-A02 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Industry dictionaries (legal/health/real-estate) layered over customer dictionaries.
METRIC: incremental savings from dictionary layer (delta tokens).
RISKS: wrong mappings; must be reversible.

TCO-A03 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Prompt template detection (send template once; subsequent calls send template_id + variables).
METRIC: instruction-token reduction + identical outputs on A/B tests.
RISKS: template mis-detection; needs fallback to full prompt.

TCO-A04 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Conversation state snapshot (store structured state; stop resending full chat history).
METRIC: reduced context tokens per request; stable task success rate.
RISKS: state corruption; requires audit + diff logs.

TCO-A05 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Context pruning with proofs (only keep evidence-bearing facts; record what was dropped).
METRIC: token reduction + no drop in user-rated correctness.
RISKS: removing critical nuance; mitigated by critical-fields whitelist.

TCO-A06 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: “Stop sending history” detector (when history no longer improves outcomes, cut it).
METRIC: quality unchanged with reduced tokens over N requests.
RISKS: false positives; must backoff to include history.

TCO-A07 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Chunk routing (cheap model per chunk; one final compose call).
METRIC: total cost vs baseline while preserving factuality.
RISKS: cross-chunk inconsistency; requires merge checks.

TCO-A08 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Semantic dedup cache (same meaning → return cached answer).
METRIC: cache hit rate + cost saved + user satisfaction.
RISKS: stale answers; requires TTL + invalidation rules.

TCO-A09 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Response prediction / precompute for scheduled patterns (batch off-peak).
METRIC: latency improvement + lower compute rates (where applicable).
RISKS: wasted compute if predictions wrong; must be opt-in for batch jobs.

============================================================
B) MODEL ROUTING (CHEAP WHEN SUFFICIENT, EXPENSIVE WHEN REQUIRED)
============================================================

TCO-B01 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Difficulty classifier selects model tier before calling.
METRIC: cost reduction with stable success rate.
RISKS: under-routing; mitigated by auto-escalation.

TCO-B02 | STATUS:PLANNED | TYPE:QUALITY
MECHANISM: Quality threshold routing (customer sets min quality; auto-escalate if below).
METRIC: % requests meeting threshold; cost delta.
RISKS: cost spikes; needs caps + reporting.

TCO-B03 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Confidence gating (if low confidence, retry with larger model).
METRIC: fewer unnecessary expensive calls + improved correctness.
RISKS: retry loops; limit attempts.

TCO-B04 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Cheap→expensive ladder (small draft → medium refine → large finalize only if needed).
METRIC: average cost per successful outcome.
RISKS: latency; must support batch/async where allowed.

TCO-B05 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Specialist map by task type (extraction vs reasoning vs formatting).
METRIC: cost vs baseline per task category.
RISKS: misclassification; needs quick override.

TCO-B06 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: User-value tiering (critical flows always best; low-stakes flows cheapest).
METRIC: cost reduction while protecting critical KPIs.
RISKS: mis-tagging; must be explicit.

TCO-B07 | STATUS:PLANNED | TYPE:QUALITY
MECHANISM: Explainable routing (log why a route happened; show savings).
METRIC: trust/retention + support tickets reduced.
RISKS: exposing sensitive prompts; redact.

TCO-B08 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: “Model roulette” for non-critical tasks (route to cheapest available that meets threshold).
METRIC: extreme savings on low-stakes volume.
RISKS: quality variance; only opt-in.

============================================================
C) COMPRESSION + DRIFT PROTECTION (MEANING SAFETY)
============================================================

TCO-C01 | STATUS:PLANNED | TYPE:SAFETY
MECHANISM: Critical-fields whitelist (intent, constraints, next action, key facts).
METRIC: drift incidents detected/avoided.
RISKS: incomplete whitelist; iterate by incident logs.

TCO-C02 | STATUS:PLANNED | TYPE:SAFETY
MECHANISM: Meaning checksum (hash critical fields pre/post roundtrip).
METRIC: checksum mismatch rate + recovery success.
RISKS: false mismatches; versioned hashing.

TCO-C03 | STATUS:PLANNED | TYPE:SAFETY
MECHANISM: Nuance sidecar (structured fields preserve tone/blockers/timing; not lost to compression).
METRIC: user-rated “nuance preserved” + reduced escalations.
RISKS: privacy; must follow consent model.

TCO-C04 | STATUS:PLANNED | TYPE:SAFETY
MECHANISM: Round-trip validation tests (compressed→expanded must match critical fields; else resend full).
METRIC: prevented drift %.
RISKS: added overhead; minimize checks.

TCO-C05 | STATUS:PLANNED | TYPE:SAFETY
MECHANISM: Human-visible drift diff (when drift occurs, show minimal diff + auto-correct).
METRIC: time-to-repair + user trust.
RISKS: confusion; only show when needed.

============================================================
D) CPU/COMPUTE OVERHEAD CONTROL (DON’T LOSE SAVINGS TO PROCESSING)
============================================================

TCO-D01 | STATUS:PLANNED | TYPE:OVERHEAD
MECHANISM: Lazy expansion (only expand to human-readable when a human requests it).
METRIC: CPU saved + latency distribution.
RISKS: debugging complexity; provide admin tooling.

TCO-D02 | STATUS:PLANNED | TYPE:OVERHEAD
MECHANISM: Cache decoded packets (decode once; reuse across reads).
METRIC: decode CPU/time reduced.
RISKS: memory growth; eviction policy.

TCO-D03 | STATUS:PLANNED | TYPE:OVERHEAD
MECHANISM: Batch decompress / vectorized decode.
METRIC: throughput increase per core.
RISKS: batching adds latency; limit batch windows.

TCO-D04 | STATUS:PLANNED | TYPE:OVERHEAD
MECHANISM: Adaptive compression level (heavy only when worth it; light for short msgs).
METRIC: net savings after compute.
RISKS: incorrect thresholding; tune.

TCO-D05 | STATUS:PLANNED | TYPE:OVERHEAD
MECHANISM: Edge compression where feasible (client compresses; server routes).
METRIC: server CPU reduced.
RISKS: client complexity; must be optional.

============================================================
E) PROOF, TRUST, AND GUARANTEES (SELLABLE WITHOUT HYPE)
============================================================

TCO-E01 | STATUS:PLANNED | TYPE:PROOF
MECHANISM: Savings ledger per request (before/after tokens, model used, cost, quality score).
METRIC: verified savings report (monthly).
RISKS: sensitive data; redact + consent.

TCO-E02 | STATUS:PLANNED | TYPE:QUALITY
MECHANISM: Quality score guarantee (auto-escalate if below threshold).
METRIC: threshold pass rate.
RISKS: cost spikes; caps.

TCO-E03 | STATUS:PLANNED | TYPE:SAFETY
MECHANISM: Drift insurance (if meaning drift occurs and is attributable, credit/refund per ARAV).
METRIC: incidents + credits + retention.
RISKS: abuse; clear attribution rules.

TCO-E04 | STATUS:PLANNED | TYPE:PROOF
MECHANISM: A/B testing service (compressed vs baseline; prove indistinguishable).
METRIC: blinded comparison results.
RISKS: experimentation risk; opt-in.

TCO-E05 | STATUS:PLANNED | TYPE:QUALITY
MECHANISM: Human-in-the-loop spot checks (tiny sample rate).
METRIC: QA agreement rate; incident prevention.
RISKS: privacy; strict anonymization + consent.

============================================================
F) AUTONOMOUS AGENTS (SCALE SALES/SUPPORT/OPTIMIZATION WITH NO AD SPEND)
============================================================

TCO-F01 | STATUS:PLANNED | TYPE:GROWTH
MECHANISM: AI Sales Agent (monitors complaints, helps, routes to free audit, follows up).
METRIC: leads/week + conversion rate.
RISKS: spam perception; must be helpful-first and rate-limited.

TCO-F02 | STATUS:PLANNED | TYPE:GROWTH
MECHANISM: AI Support Agent (billing, routing explanations, setup help, escalations).
METRIC: ticket resolution time + churn reduction.
RISKS: wrong answers; honesty doctrine + escalation.

TCO-F03 | STATUS:PLANNED | TYPE:GROWTH
MECHANISM: AI Onboarding Agent (connect, test, configure, first savings proof).
METRIC: time-to-first-value; onboarding completion rate.
RISKS: user confusion; stepwise confirmations.

TCO-F04 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Autonomous Optimization Agent (monitors usage, proposes changes, applies with permission).
METRIC: additional verified savings over time.
RISKS: autonomy creep; require explicit permissions + rollback.

TCO-F05 | STATUS:PLANNED | TYPE:GROWTH
MECHANISM: Content Generation Agent (case studies, posts, docs; human review optional).
METRIC: content volume + inbound leads.
RISKS: tone drift; must follow comms doctrine.

============================================================
G) PRICING + BUSINESS MODEL INNOVATIONS (OPTIONAL, HIGH-POWER, HIGH-RISK)
============================================================

TCO-G01 | STATUS:PLANNED | TYPE:PRICING
MECHANISM: Reverse pricing (free month → invoice % of verified savings after proof).
METRIC: conversion rate + payment rate.
RISKS: non-payment; contracts + thresholds.

TCO-G02 | STATUS:PLANNED | TYPE:PRICING
MECHANISM: Savings credits (credits worth > cash refund to reduce cash burn).
METRIC: retention + reduced refunds.
RISKS: perceived gimmick; must be transparent.

TCO-G03 | STATUS:PLANNED | TYPE:PRICING
MECHANISM: Savings staking (customer leaves savings with us for time-based bonus).
METRIC: capital generated + retention.
RISKS: legal/financial regulation; requires legal review.

TCO-G04 | STATUS:PLANNED | TYPE:PRICING
MECHANISM: Savings pool (group buying / pooled tiers for small customers).
METRIC: improved rates + reduced churn.
RISKS: complexity; keep simple.

TCO-G05 | STATUS:PLANNED | TYPE:PRICING
MECHANISM: Future savings loan (advance projected savings; repay via retention).
METRIC: retention + default rate.
RISKS: financial product risk; requires legal review.

============================================================
H) DIFFERENTIATORS / MOATS (ENTERPRISE + NETWORK EFFECTS)
============================================================

TCO-H01 | STATUS:PLANNED | TYPE:PROOF
MECHANISM: Carbon dashboard + certificate (efficiency → emissions estimate).
METRIC: customer adoption; PR/retention.
RISKS: greenwashing risk; must be honest with assumptions.

TCO-H02 | STATUS:PLANNED | TYPE:COMPLIANCE
MECHANISM: Compliance modes (HIPAA/SOC2/GDPR region controls; audit trails).
METRIC: enterprise adoption + reduced procurement friction.
RISKS: liability; must be real or not claimed.

TCO-H03 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: BYOS (Bring Your Own Server) compute contribution network.
METRIC: capacity added + cost reduced.
RISKS: security + isolation; strict sandboxing.

TCO-H04 | STATUS:PLANNED | TYPE:SAVINGS
MECHANISM: Real-time bidding marketplace (models bid; cheapest qualified wins).
METRIC: marginal cost reduction + liquidity.
RISKS: complexity + adversarial bidding; requires safeguards.

TCO-H05 | STATUS:PLANNED | TYPE:PRICING
MECHANISM: Time-machine pricing (batch jobs: run later for cheaper).
METRIC: savings uplift + customer adoption.
RISKS: UX confusion; opt-in only.

============================================================
I) IMPLEMENTATION PRIORITY (ANTI-SPRAWL)
============================================================

ACTIVE BUILD CAP (rule):
At any time, no more than 5 items can be IN_BUILD. Everything else remains PLANNED.

Suggested “first 5” candidates (modifiable):
- TCO-E01 Savings ledger (proof)
- TCO-B01 Difficulty classifier (routing)
- TCO-C01 Critical-fields whitelist (meaning safety)
- TCO-D01 Lazy expansion (overhead control)
- TCO-F03 Onboarding agent (time-to-first-value)

End of Annex.
