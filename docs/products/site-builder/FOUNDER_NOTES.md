<!-- SYNOPSIS: Site Builder — Founder Notes (verbatim intent, captured from conversation) -->

# Site Builder — Founder Notes (verbatim intent, captured from conversation)

> Purpose: durable capture of Adam's Site Builder requirements from the working
> session so intent is never lost again. These are the FOUNDER's words/intent,
> distilled to requirements. Anything not yet built is tracked in the Build Plan
> of `PRODUCT_HOME.md` and the executable `BUILD_QUEUE.json`.

Last captured: 2026-07-06

---

## Founder requirements — 2026-07-06 session (editor + research)

### Live preview editor (client-facing, both modes available)
- **AI chat + mic box** on the preview: the client types OR speaks (microphone)
  a plain-language change ("make the hero video bigger, move testimonials up,
  warmer colors") and the system rewrites the site and reloads. They do not
  manually touch anything — they give directions, it gets done.
- **Manual controls** available alongside: drag/reorder sections, click-to-edit
  text, hide/show sections, color pickers. Both modes coexist — not either/or.
- **Template switcher** to flip between design variants live.
- **Color-palette toggle** — palettes are NOT random. Derived from (a) the
  business's current site brand colors, (b) what competitors use, and (c) proven
  wellness/conversion color theory.

### Competitor research — DUAL CATEGORY (hard requirement)
- The subject (Sherry) is BOTH a **midwife** and a **wellness practitioner**.
- The system must benchmark BOTH categories every time: **home-birth / midwifery
  sites AND wellness-practitioner sites** — and take the best of each.
- Analysis must know a business can have multiple practice categories and search
  competitors for each. Midwifery is the primary comparison but wellness is
  required too.
- Actually DO live competitor search (the first wellroundedmomma build did not —
  no competitor URLs were passed). Look at how competitors do it, what we can do
  better.

### Socials + YouTube — actively discovered (not just on-page links)
- Do not only read links present on their website. **Actively search** for their
  YouTube channel, Instagram, etc. — even if not linked on the site — and LIST
  what is found.
- YouTube counts as a social. Sherry has a full YouTube channel; her videos are
  the highest-trust content and must be pulled into a real "Watch & Learn"
  gallery (real embeds, not a "coming soon" placeholder).

### Editor is a 3-pane WORKSPACE + service ladder (2026-07-06)
- Layout: **left = services sidebar**, **center = the live website**, **right = chat window**.
- The website edits in real time: **click an element to change it**, OR **talk/type** and it
  changes live.
- Left sidebar = à-la-carte add-on services (the revenue ladder), e.g.: logo & brand kit,
  corporate/brand package, ClickFunnels build + ad placement/management, managed Google
  Business Profile + local SEO, social-media management, SEO/content care plan.
- HONESTY GUARDRAILS: never promise "rank #1" on Google — SEO can't guarantee it; frame as
  "managed GBP + local SEO to maximize ranking". Each service is a real paid offering
  (one-time or monthly MRR), consistent with the product revenue model.
- SYNERGY: the sidebar is **competitor-aware** — the Strategy tab feeds it so the right
  upsell surfaces first ("competitors don't run ads / have no booking funnel — want that?").

### Conversion / funnel theory (build toward)
- One goal per page; remove distractions competing with the primary CTA.
- Add a low-friction lead magnet (free download / free video) to capture the
  ~90% not ready to book cold — biggest conversion lever.
- Video social proof near the CTA; sticky mobile CTA; honest urgency (real
  limited slots, never fake countdowns).
- Funnel: hook (video) → value (lead magnet) → trust (real testimonials+video)
  → low-friction ask (free consult) → automated email follow-up.

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
