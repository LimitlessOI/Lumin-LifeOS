<!-- SYNOPSIS: Founder Packet — Marketplace Opportunity Scanner, first real stage of the zero-capital autonomous opportunity engine. -->

# Founder Packet — Marketplace Opportunity Scanner

**Mission ID:** `MARKETPLACE-OPPORTUNITY-SCANNER-0001`
**Locked:** 2026-08-08 (Adam — "this engine needs to identify opportunities nonstop, build those opportunities... feed our API costs, feed my bills, feed marketing.")
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.
**Source doctrine:** `docs/products/ZERO_CAPITAL_ECONOMIC_ENGINE.md` §5 ("Sentry's role: attack the opportunity before spending anything") and the underlying `docs/conversation_dumps/2026-08-08-zero-capital-economic-engine-strategy.md`.

---

## Priority

First real stage of the autonomous opportunity loop, and deliberately the *safest* one to build first: pure discovery/scoring, zero listings created, zero capital spent, zero marketplace account actions taken. Depends on `OVERLAY-ENGINE-RISK-GATE-0001` (shipped) only insofar as any FUTURE real-data-gathering step that browses live marketplaces will run through the now-safe overlay engine — this mission's core scoring/persistence logic has no such dependency and is pure/deterministic.

---

## Problem

There is currently no real, callable, deterministic way to take a set of observed signals about a candidate product/niche (demand, competition, margin, trend, capital required, complexity, risk) and produce a single, auditable Opportunity Score that could gate whether an experiment is worth running — the concept exists only as strategy-doc prose tonight, not as real code.

## Desired outcome

1. A real, callable, pure scoring function (`scoreOpportunity`) implementing the weighted formula from the strategy doc: demand and margin and trend increase the score; competition, capital required, operational complexity, and risk decrease it. No AI/model call — deterministic, same inputs always produce the same output, matching the same "Tier 1 — deterministic first" discipline named in the source doctrine.
2. A real confidence signal on every score: if a candidate is scored with missing/defaulted factors, the result must say so explicitly (per the Truthful Capability Principle already adopted into the LifeOS Communication Blueprint tonight) — never present a score computed from partial data as if it were fully evidenced.
3. Real persistence: a self-bootstrapping `marketplace_opportunities` table (record niche/source/signals/score/confidence/status), so scored candidates are a durable, queryable record — the actual substrate the future Sentry-attacks-the-opportunity and Minimum-Viable-Experiment stages will consume.
4. A real route to submit a candidate for scoring and list/query existing scored opportunities.

## Explicitly out of scope this mission (named, not silently dropped)

- Any live browsing of real marketplaces (Etsy/eBay/Printify/etc.) to gather real signals automatically — that is a separate, later mission once this scoring/persistence substrate is proven, and it will route through the now-safe overlay engine (`OVERLAY-ENGINE-RISK-GATE-0001`) when built.
- Sentry-attacks-the-opportunity (adversarial review of a scored candidate) — later mission, consumes this one's output.
- Minimum Viable Experiment / kill-switch budgets — later mission, gates on real capital, needs its own careful design.
- Any action that creates a listing, spends money, or touches a real marketplace account.

## FOUNDER SUCCESS TEST

Given a candidate with strong demand/margin/trend and weak competition/capital/complexity/risk, `scoreOpportunity` returns a high score (>70) with `confidence: "full"` (all 7 factors provided). Given a candidate with only demand and margin provided, it returns a real score computed from what's known, `confidence: "partial"`, and names exactly which factors were missing. `recordOpportunity` persists a real, queryable row.

## Acceptance command

```bash
npm run marketplace:opportunity-scanner:acceptance
```
