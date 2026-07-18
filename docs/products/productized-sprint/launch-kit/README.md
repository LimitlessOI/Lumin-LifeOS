<!-- SYNOPSIS: Service-first launch kit — Founder Voice Content Pack (MarketingOS-powered) -->

# Founder Voice Content Pack — Service Launch Kit

**Owner:** Productized Sprint (Phase 0 revenue vehicle) · **Delivery engine:** MarketingOS / SocialMediaOS (live)
**Status:** READY TO SELL (managed / done-for-you). Not self-serve SaaS.
**Created:** 2026-07-10

This kit turns the **already-live** MarketingOS content engine into a sellable done-for-you
service you can charge for **this week** — with zero new server code shipped. It operationalizes
Productized Sprint **Gate 2 (delivery infra)** and **Gate 3 (marketing)** for the specific
"social media content system (30 posts)" deliverable in the Build My Thing offer.

Everything here is either a **founder action** (create a Stripe link, publish an intake form) or a
**hand-writable artifact** (docs, an external HTML page, a delivery script). No `routes/`/`services/`
modules were hand-authored — per SO-001, those go through the governed factory.

---

## The offer

**Founder Voice Content Pack** — a done-for-you content pack built from the founder's real voice.

- **What the buyer gets:** A 20–30 min AI-coached conversation (you host, or async voice notes) →
  a pack of authentic, ready-to-post social captions/hooks/posts (Instagram / LinkedIn / X / Facebook),
  formatted and delivered as a downloadable file. Optional 30-day calendar layout.
- **How it's delivered:** Through the live MarketingOS loop
  (`consent → session → coach → extract → generate → approve → export`). See `DELIVERY_SOP.md`.
- **Turnaround:** 3–5 business days (often same-day once you're practiced).

### Tiers

| Tier | Price | Deliverable | Notes |
|---|---|---|---|
| **Starter Pack** | **$497** one-time | 12–15 posts from 1 themed session | Entry offer / trial |
| **Full Pack** | **$997** one-time | ~30 posts across 5–8 themes + a 30-day calendar layout | = Build My Thing "social content system" |
| **Monthly Voice** | **$199–$497 / mo** | 1 session/mo → a fresh batch each month | Recurring; best LTV |

> **Honest yield (KNOW, verified live 2026-07-10):** ONE session with ONE story currently produces
> only a **handful of unique posts** (≈3 distinct, one per platform) — the `generate` route emits one
> piece per extraction with no dedupe (see `FINDINGS.md` F1). To hit ~30 **unique** posts for the Full
> Pack you run **5–8 short themed prompts/stories** (or several sessions) and combine — the delivery
> script dedupes automatically. Don't promise 30 posts from a single one-story call.

Pricing rationale matches Productized Sprint gates: $497 is below the "need approval" threshold for
owners; $997 is below most monthly software spend and produces something tangible; monthly is priced
under one freelance content hire.

---

## Buyer (who to sell to first)

Warmest-first, no cold outreach required:

1. **Go Vegas / EXP agents & real-estate colleagues** — already in the network; hate being on camera,
   need consistent content, can expense it.
2. **Local service-business owners** (med-spa, fitness, home services, wellness) — the exact ICP in
   the MarketingOS Y-statement.
3. **TC-service and Site-Builder clients** — existing paying relationships; natural upsell.

Start with a list of **5 named people** (Gate 3). Template outreach in `OUTREACH_TEMPLATES.md`.

---

## Time to first sale — KNOW vs THINK

- **KNOW:** The delivery engine works end-to-end on production today (verified live:
  consent→session→coach→extract→generate→approve→export all HTTP 200; a real Instagram post was
  generated and an export pack downloaded). SENTRY Layer A + Layer B receipts PASS (2026-07-10).
- **KNOW:** Delivery requires **no new code** — see `DELIVERY_SOP.md` and `scripts/deliver-content-pack.mjs`.
- **THINK:** With the two founder actions below done in a day, first sale is realistic in **~5 days**
  (1–2 days to set up Stripe + intake + send 5 warm messages, 2–3 days for reply → session → delivery).

### The only two things that gate the first sale (founder actions)

1. **Create a Stripe Payment Link** for each tier — see `STRIPE_PAYMENT_LINKS.md` (~30 min, no code).
2. **Publish the intake form** — see `INTAKE.md` (use Tally/Google Form, or host `intake-form.html`).

Everything else (offer, delivery runbook, outreach copy, delivery script) is done in this kit.

---

## Automatable GTM steps

| # | Step | Automatable? | How |
|---|---|---|---|
| 1 | Create Stripe payment links | Founder (one-time) | `STRIPE_PAYMENT_LINKS.md` |
| 2 | Publish intake form | Founder (one-time) | `INTAKE.md` + `intake-form.html` |
| 3 | Send 5 warm outreach messages | Semi — draft auto, send by founder | `OUTREACH_TEMPLATES.md` |
| 4 | Run coaching session | Manual (you host) or async voice notes | `DELIVERY_SOP.md` |
| 5 | Generate + approve + export pack | **Automated** | `scripts/deliver-content-pack.mjs` |
| 6 | Deliver pack + ask for testimonial | Semi — delivery email template | `OUTREACH_TEMPLATES.md` |
| 7 | Repeat weekly (LinkedIn "fixed a thing" post) | Semi | `OUTREACH_TEMPLATES.md` |

---

## Files in this kit

| File | Purpose |
|---|---|
| `README.md` | This index — offer, buyer, pricing, time-to-sale, GTM |
| `STRIPE_PAYMENT_LINKS.md` | Founder step-by-step to create Stripe payment links (no code) |
| `INTAKE.md` | Intake questions + hosting options |
| `intake-form.html` | Ready-to-host static intake page (host externally; not mounted in app) |
| `DELIVERY_SOP.md` | Exact runbook to deliver a pack via the live MarketingOS engine |
| `OUTREACH_TEMPLATES.md` | Email / DM / call scripts, objections, delivery + testimonial emails |
| `scripts/deliver-content-pack.mjs` (repo root `scripts/`) | Automates generate→approve→export against live prod |

---

## What this kit is NOT

- Not self-serve SaaS. There is **no public checkout wired into the app**, **no social auto-posting**,
  and **no analytics** — those are the platform builds queued next (posting, tracking, self-serve
  billing/auth, audio). See `docs/products/marketingos/PRODUCT_HOME.md` Phases 5/7 and the platform
  mission specs.
- Not a claim that anything is "shipped/works/passed" beyond what has a live/SENTRY receipt. Labeled
  KNOW / THINK throughout.
