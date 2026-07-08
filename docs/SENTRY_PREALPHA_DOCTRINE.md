<!-- SYNOPSIS: SENTRY Pre-Alpha Completion Doctrine (Standing Order SO-002) -->

# SENTRY Pre-Alpha Completion Doctrine (Standing Order SO-002)

**Ratified from founder direction, 2026-07-03.** This is law: no client-facing
feature may be called "done" — and nothing reaches the founder — until SENTRY has
walked it as a real client and it passes **both** layers below. SENTRY tests; it
never builds (separation of powers). The builder never tests its own output.

## The founder's words (verbatim)

> "The system should have done a pre-alpha test of every feature before I am
> looking at it. I'm not there to solve the problems. I'm there to adjust the
> experience or add new ideas."

> "It could do layer A and then do layer B as a final, but it has to do a real
> walkthrough like you're a human being … simulate a real human being … look at
> it from the client's perspective. Like, if a button's in a stupid place or it's
> requiring us to do a step that maybe is unneeded, it should be thinking of ways
> to make it a better experience as well."

## The two layers (both required)

**Layer A — structural (no browser).** HTTP-level assertions that catch broken
plumbing. Fails closed. For Site Builder: `npm run sentry:site-builder:layer-a`
(`scripts/run-site-builder-prealpha.mjs`) — preview loads, editor loads, canvas
iframe `src` is absolute and resolves to the REAL site (catches "Cannot GET"),
the built site is NOT a parked/placeholder scrape, checkout → Stripe.

**Layer B — human-sim (real browser).** A real Chrome drives the actual UI like a
client: clicks, types in the chat, tries to break it, screenshots each step, and
a model critiques the experience from the client's perspective (verdict +
friction points + concrete improvements). Fails closed. For Site Builder:
`POST /api/v1/sites/prealpha/layer-b` (`routes/site-builder-prealpha-routes.js`),
which runs on prod where Chrome launches.

## The rule

1. Run Layer A. If it fails, the feature is NOT done — fix and re-run.
2. Then run Layer B. If it fails (or the UX verdict is "broken"), the feature is
   NOT done — fix and re-run.
3. Only when BOTH pass may the feature be marked done or shown to the founder.
4. "Technically works" (endpoint 200) is NOT "done." UX judgment is required.
5. SENTRY authors/records the walkthrough (conductor + system), never the builder.
6. The system builds the fixes through the governed pipe; the conductor authors
   the spec + proof only. Do not hand-write feature fixes; do not fake approval.

## Provenance

- Layer A: PR #280. Layer B: PR #281. Content-truth guard: PR #282.
- Editor iframe fix the gate was built to catch: PR #279.
