<!-- SYNOPSIS: 2026-07-06 — Site Builder requirements (founder session) -->

# 2026-07-06 — Site Builder requirements (founder session)

> Captured per the Site Builder product-home convention
> (`docs/products/site-builder/conversations/YYYY-MM-DD-topic.md`).
> Distilled from Adam's working session. Full requirements doc lives at
> `docs/products/site-builder/FOUNDER_NOTES.md`; this is the dated conversation
> record so intent is never lost again.

## Context
Adam reviewed a generated preview and flagged that the product "sucks" on two
axes: design quality, and — more seriously — **fabricated information**.

## Decisions made (founder's words, distilled)

1. **Design still needs to be much better.**

2. **We fabricated data — forbidden.** The generator invented pricing
   ($400/$750/$1200), stats ("200+ clients", "5★", "10+ years"), and
   testimonials. None of it was on the prospect's real site. This is an
   integrity problem and must stop.

3. **Go find the real thing instead of inventing.** Search the business's real
   presence — Google, Yelp, Facebook (incl. groups), and their socials — for
   real reviews/articles/ratings/hours/services.

4. **If nothing real is found, don't lie — label it.** Show a testimonial with
   small print: "AI-generated testimonial sample — not a real client review."
   Never a fake name or star rating.

5. **Socials also inform design taste** (palette/aesthetic they already like)…

6. **…but don't trust bad taste.** Their site is probably trash. Socials only
   lightly inform; **our own template library leads** — many custom,
   cutting-edge, trend-aware designs.

7. **Toggle between templates** live on the preview until they find one they love.

8. **Logo designer** so they can play with logo options.

9. **No free-tier AI in the shipped product.** Only strong paid models are
   hardwired into what the system ships. Free tiers are for internal build-time
   tooling only (where we can monitor capability).

## Meta decision
"The system builds; I fix the builder so it can build the product." Two layers:
we build the builder, the builder builds the product. Site Builder is the first
real product driven through the autonomous product-build orchestrator.

## Shipped from this session
- Truthfulness fix + real-data enrichment + stronger paid design model (PR #210).
- 10-template library + variant toggle + Logo Studio + no-free-tier rule (PR #211).
- A/B subject-line testing (`pickSubjectVariant`) — **built autonomously** by the
  factory, commit `9cfc4e59`.

## Still open (tracked in BUILD_QUEUE.json)
- Preview-expiry sweep (`sb-preview-expiry-sweep`).
- Client-facing customization UI (`sb-customization-ui`) — **founder-gated**:
  needs Adam to confirm exact editable fields and whether edits persist
  server-side or stay client-side.
