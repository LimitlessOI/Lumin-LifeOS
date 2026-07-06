<!-- SYNOPSIS: Site Builder — Founder Notes (verbatim intent, captured from conversation) -->

# Site Builder — Founder Notes (verbatim intent, captured from conversation)

> Purpose: durable capture of Adam's Site Builder requirements from the working
> session so intent is never lost again. These are the FOUNDER's words/intent,
> distilled to requirements. Anything not yet built is tracked in the Build Plan
> of `PRODUCT_HOME.md` and the executable `BUILD_QUEUE.json`.

Last captured: 2026-07-06

---

## What the product is

A done-for-you website builder for wellness/health businesses. It scrapes a
prospect's existing site, uses AI to build a modern, conversion-optimized
preview, scores quality, emails the prospect a link to their free preview, and
sells them the upgrade. A pipeline CRM tracks prospects; email suppression/log
keeps it compliant.

---

## Founder requirements (from conversation)

### 1. TRUTH — never fabricate (highest priority)
- The generator was inventing pricing ($400/$750/$1200), stats ("200+ clients",
  "5★", "10+ years"), and testimonials. **This is forbidden.** It is an
  integrity/trust problem and violates the product's own rules.
- Never invent prices, dollar amounts, star ratings, review/client counts,
  years in business, awards, or named testimonials/quotes.
- Use ONLY facts actually present on the prospect's real site / real sources. If
  a fact isn't available, **leave it out** — a shorter truthful page beats an
  impressive fake one.

### 2. Real-data enrichment (go find the real thing, don't invent)
- Before building, search the business's real web presence — Google Business,
  Yelp, Facebook (incl. groups), and their own social media — for **real**
  reviews, ratings, hours, services, and articles.
- Only use verified real content, with source. No source → leave it out.

### 3. Labeled samples when nothing real is found
- If no real reviews/testimonials can be found, we **do not lie**. Show a
  testimonial card with small print reading exactly:
  **"AI-generated testimonial sample — not a real client review"**
- Never with a fake name or fake star rating.

### 4. Socials inform design taste
- Looking at their socials should also give design cues (palette, aesthetic,
  style) for what they already like — feed that into generation.

### 5. …but don't trust bad taste — our templates lead
- Their existing site is probably trash, so socials only **lightly** inform.
- The real quality comes from **our own template library**: many custom,
  cutting-edge, trend-aware designs (editorial, organic/warm, clinical-clean,
  bold-gradient, luxe-minimal, etc.).

### 6. Toggle between templates
- On the preview, the client can cycle through design variants live until they
  find the one they love ("Use this design").

### 7. Logo designer
- A Logo Studio so they can generate and play with logo options (style, icon,
  font, palette; download SVG/PNG).

### 8. No free-tier AI in the product (hard rule)
- Only strong, paid models are hardwired into what the system SHIPS
  (`claude_sonnet`, `gpt-4o`/`openai_gpt`, etc.). Free tiers may be used only for
  internal build-time tooling where we can monitor capability — never in the
  shipped product path.

### 9. Additional documented backlog (from product home)
- A/B subject-line testing for cold email.
- Preview-expiry sweep (nightly cleanup of expired previews).
- Client live-edit-before-publish.
- Prospect scoring by worst existing sites (1–10 scorecard).

---

## Status pointers (source of truth)
- Live product truth + change receipts: `PRODUCT_HOME.md`
- Executable remaining work (autonomous loop): `BUILD_QUEUE.json`
- Owned files: `FILE_MANIFEST.json`

## Shipped so far (see PRODUCT_HOME change receipts for SHAs)
- Truthfulness fix (no fabricated pricing/stats/testimonials) + real-data
  enrichment + stronger paid design model (PR #210).
- Design-template library + live variant toggle + Logo Studio + no-free-tier
  product rule (PR #211).

## Not yet done (tracked in BUILD_QUEUE.json)
- A/B subject-line testing (`sb-ab-subject-testing`).
- Preview-expiry sweep (`sb-preview-expiry-sweep`).
- Client-facing customization UI (`sb-customization-ui`, founder-gated).
