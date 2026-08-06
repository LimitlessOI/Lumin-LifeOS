<!-- SYNOPSIS: Top-level systems map — how the constitution, BuilderOS, LifeOS, LimitlessOS, and the ~47 registered products actually relate, checked directly against the repo. Not law, not a proposal; a ground-truth atlas for the 2026-08-06 constitutional-offices brainstorm. -->

# Ecosystem Systems Map (2026-08-06)

**Purpose:** Adam asked: "What is our system? I kinda think in my mind of LifeOS as the central figure... but I don't know." This document answers that directly, with the honest complication found while checking: **the existing documentation doesn't fully agree with itself either.** Companion to `docs/constitution/AS_IS_GOVERNANCE_STRUCTURE_2026-08-06.md`, which covers the constitutional/role layer (Chair, Sentry, Architect, Builder, Wisdom, CFO) — this document covers the product/architecture layer (what systems exist, how they relate, what depends on what).

**Status: FACTUAL SNAPSHOT + one explicitly flagged documentation conflict.** Not doctrine, not a proposal. Where the real docs disagree with each other, that's reported as a finding for you to resolve, not silently smoothed over.

---

## 1. The honest headline: is LifeOS central? The docs contradict themselves.

`docs/products/limitlessos/PRODUCT_HOME.md`'s own **Vision statement** (its words, "founder lock"):

> "LifeOS helps people become the best version of themselves. LimitlessOS helps businesses become the best version of themselves. BuilderOS continuously improves both."

That's a **peer relationship** — LifeOS (person) and LimitlessOS (business) are equals, with BuilderOS as a cross-cutting improvement engine serving both, not a child of either.

**Fifteen lines later, in the same file**, under "Child products (modules)": LimitlessOS lists **LifeOS (human)** and **BuilderOS** as its own child modules, alongside MarketingOS, SocialMediaOS, Site Builder, AI Receptionist, SalesOS.

Those two statements can't both be true. This isn't your confusion — it's a real, unresolved conflict in the document itself, a few lines apart, never reconciled. Your uncertainty ("I don't know, I'm not sure") is the correct read of what's actually written, not a gap in your own understanding.

**RESOLVED, 2026-08-06 — Adam's own framing, and it dissolves the contradiction rather than picking a side:**

> "LifeOS and LimitlessOS are related to businesses and individuals, and it is the heart of our products, projects. It is not the system, which really revolves around the constitution and the Builder OS."

Neither LifeOS nor LimitlessOS is "the system," and neither is the other's parent or child — that whole peer-vs-child question was a category error. **The products are not the system. The products are built by the system.** "The system" is the Constitution + BuilderOS (the real, governing layer documented in `AS_IS_GOVERNANCE_STRUCTURE_2026-08-06.md`). LifeOS and LimitlessOS are both products of that system — the person-facing and business-facing halves of what it builds, exactly as the peer-relationship reading in §1 already had it. `limitlessos/PRODUCT_HOME.md`'s "Child products" table is still internally inconsistent with its own Vision Statement and would benefit from a real cleanup pass, but it no longer matters *which* is central — neither is, by design.

---

## 2. The working model that's actually consistent (synthesized from the non-contradictory parts)

Cutting through the conflict above, here's what every other real, checked document agrees on:

```
Constitution (NORTH_STAR_SSOT.md) — supreme, governs everything
        ↓
   BuilderOS — construction/repair mechanism, explicitly
   "Subordinate to SSOT North Star Constitution"
   (docs/products/builderos/PRODUCT_HOME.md:30,694)
        ↓
   Chair/Lumin — the approving + conversational authority.
   BuilderOS's own doctrine names Chair/Lumin first in its
   "Minimal real-seat order" (line 306-312): Chair → CFO →
   Historian → SNT → ARC
        ↓
   LifeOS — "the human operating system... the Chair-facing,
   truth-first, adaptive shell" (docs/products/lifeos/
   PRODUCT_HOME.md:30-36). LifeOS HOSTS Chair's founder-facing
   surface (public/overlay/lifeos-app.html); it does not own
   Chair, the constitution, or BuilderOS — it explicitly
   disclaims owning them (lines 68-74: "LifeOS depends on
   shared systems but does not own them: platform doctrine
   and constitutional law, BuilderOS mission-pack system,
   Token accounting...")
```

**The one clean, defensible statement:** Chair is the reasoning/approval authority, not a product. LifeOS is a real product that happens to be where Chair's founder-facing UI lives today. BuilderOS is not a product either — it's the construction mechanism, explicitly subordinate to the constitution, that builds and repairs the products (possibly including LifeOS's own code). LimitlessOS and LifeOS are documented as peers (person vs. business) in the one place that states a philosophy, but documented as parent/child in the one place that lists modules — that specific conflict is a real, open decision, not something this map is resolving for you.

**Recommendation, not a decision:** if you want LifeOS to genuinely be "the central figure," that's a real, available choice — but it means rewriting LimitlessOS's Vision Statement (which currently makes them peers) and deciding whether LimitlessOS becomes a *module of* LifeOS rather than the reverse. Currently, the peer framing is the philosophically stated one; the child-module table looks more like it grew ad hoc as products were added and nobody went back to reconcile it with the vision statement above it.

---

## 3. Real shared infrastructure — checked against `docs/products/PRODUCT_REGISTRY.json` directly (not each product's own self-description, which doesn't always agree — see §5)

Of 47 registered products, exactly **3** carry a non-product status in the registry itself:

| Product | Registry status | What it actually does |
|---|---|---|
| **`creative-engine`** | `SHARED_PLATFORM_MODULE` | Shared media rendering (footage edit, photo polish, script compose, graphic design, social publish) for MarketingOS, SocialMediaOS, Site Builder, LifeRE, and anything else that needs it. `footage_edit`/`photo_polish` are live and tip-proven; the rest is gated on API tokens. |
| **`boldtrail`** | `SHARED_PLATFORM_MODULE` | Live shared CRM adapter, part of the LifeRE stack, available to any product needing CRM access. Will eventually be replaced; isolation is built into this module so consumers aren't affected when that happens. |
| **`ideavault`** | `PLATFORM_TOOL` | Not a product — the intake/routing engine that catalogs conversations/ideas into the right product's `conversations/` folder (the mechanism behind every "captured, not built" note this whole session). |

The other 44 entries are all tagged `ACTIVE_PRODUCT_HOME` in the registry, regardless of how real or built-out they actually are (see §5 for how thin most of them are).

---

## 4. Product landscape — grouped for navigation, not authoritative

**Caveat up front, honestly labeled THINK not KNOW:** the groupings below are my own inference from product names and the notes already gathered this session — I have not personally read all 44 PRODUCT_HOME.md files to confirm each one's stated parent/domain. Treat this as a first-pass map to correct, not a verified taxonomy.

**Person-facing / LifeOS-adjacent (by apparent domain):** `lifeos`, `lifere`, `life-coaching`, `wellness-studio`, `kids-os`, `teacher-os`, `legacy-imprint`, `faith-studio`, `music-talent-studio`, `lumin-university`, `personal-finance-os`, `word-keeper`

**Business-facing / LimitlessOS-adjacent:** `limitlessos`, `marketingos` (+ `socialmediaos` module), `business-tools`, `site-builder`, `ai-receptionist`, `salesos`, `tc-service`, `clientcare-billing-recovery`, `financial-revenue`, `outreach-crm`, `productized-sprint`, `white-label`, `creator-media-os`, `video-pipeline`, `story-studio`, `game-publisher`

**Platform / meta / governance layer (serve the ecosystem itself, not an end client):** `builderos`, `ai-council`, `command-center`, `project-governance`, `capability-map`, `token-accounting-os`, `zero-drift-handoff-protocol`, `kingsman-protocol`, `memory-intelligence`, `memory-system`, `universal-overlay`, `knowledge-base`, `enterprise-ai-governance`

**Shared infrastructure / tools:** `creative-engine`, `boldtrail`, `ideavault`

**Unclear domain from name alone, not categorized:** `conflict-arbitrator`, `oil-security-divisions`

---

## 5. The maturity signal that matters most for "where we're at"

Of all 47 registered products, only **8** carry any `readiness_state`/`blueprint_score` in the registry at all — meaning the other **39 have never been scored for real build-readiness**. They're a folder and a `PRODUCT_HOME.md`, not necessarily anything assessed:

| Product | Readiness state | Blueprint score |
|---|---|---|
| `site-builder` | PARTIAL_CODE_PRESENT | 7 |
| `tc-service` | PARTIAL_CODE_PRESENT | 7 |
| `creative-engine` | LIVE_SHARED_INFRA | 7 |
| `api-cost-savings` | PARTIAL_CODE_PRESENT | 6 |
| `clientcare-billing-recovery` | PARTIAL_CODE_PRESENT | 5 |
| `marketingos` | PARTIAL_CODE_PRESENT | 5 |
| `salesos` | FOUNDER_VISION | 2 |
| `legacy-imprint` | FOUNDER_VISION | 1 |

**This is the real "don't burn everything down or start from scratch" data point:** the ecosystem isn't 47 built products — it's roughly 8 with any real code/assessment behind them (and only 3 of those score ≥6), plus ~39 registered-but-unassessed names. Deciding where to go next is much more about triaging that gap than about designing new constitutional offices.

---

## 6. What this map deliberately does not do

- Does not go deep into any single product's internal architecture — that's each product's own `PRODUCT_HOME.md`, and there are 44+ of them; this stays at the atlas altitude you asked for.
- The LifeOS/LimitlessOS peer-vs-child conflict flagged in §1 is now resolved — see the RESOLVED note there. `limitlessos/PRODUCT_HOME.md`'s "Child products" table still needs a real cleanup pass to match the resolution, but that's a documentation-hygiene task, not an open decision anymore.
- Does not re-derive the constitutional/role layer (Chair, Sentry, Architect, Builder, Wisdom, CFO, AI Council) — see the companion document, `docs/constitution/AS_IS_GOVERNANCE_STRUCTURE_2026-08-06.md`, filed the same session.
- Does not categorize all 44 products with certainty — §4's groupings are a first pass, not verified against each product's own stated scope.

@ssot docs/products/lifeos/PRODUCT_HOME.md
