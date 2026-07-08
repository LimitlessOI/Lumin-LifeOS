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

## Solution-mandatory (founder principle, 2026-07-03 — "we don't believe in impossible")

> "When SENTRY flags a problem, it should also give a solution. And that's true
> of everything — it should always be offering a solution, whether it's right or
> wrong. We don't believe in impossible. It's impossible until we learn
> otherwise, like the two-minute mile."

**Every SENTRY finding is INVALID unless it carries a proposed solution.** A flag
without a proposed fix is not a finding — it is an incomplete report and does not
satisfy the gate's reporting contract. Therefore:

7. Each failed assertion and each UX friction point MUST include a
   `proposed_solution` (a concrete next step: the file/route/spec to change, the
   config to set, or the experiment to run). "Right or wrong" is acceptable — a
   wrong-but-concrete proposal is better than silence, because it can be tried,
   measured, and improved. Uncertainty is labeled (KNOW / THINK / GUESS), never
   used as a reason to omit the proposal.
8. "Impossible" / "can't be done" is not a permitted terminal state. The correct
   framing is "not solved **yet**" plus the next thing to try. If a solution is
   genuinely unknown, the proposed solution is the smallest experiment that would
   reduce the uncertainty.
9. These proposed solutions are the system's self-fix fuel: the system converts
   each finding+solution into a governed improvement proposal (see
   `services/builderos-improvement-loop.js`, which routes findings →
   blueprint-delta → build → re-verify). This is how the system does the
   conductor's job continuously — flag, propose, build, re-test — without waiting
   on a human.

## Generalized across ALL products (2026-07-03 — Chair consensus LIFERE_COUNCIL_1783489419170)

SO-002 is **not Site-Builder-only**. Every BP product that a client or the founder
touches is governed by the same two-layer gate, declared as config — not code — in
`builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json`. A product-agnostic engine
runs any registered product purely from that registry:

- Engine: `scripts/sentry-prealpha-gate.mjs` (conductor SCRIPT; authors no product
  code, only orchestrates each product's already-proven layer scripts/endpoints).
- Run one: `npm run sentry:gate -- <product-id>` · all: `npm run sentry:gate:all`
  · list: `npm run sentry:gate:list`.
- Each product declares its `layers` (Layer A structural + Layer B human-sim) and a
  per-product `findingsFeed`. The engine folds every failing signal through the
  system-authored closer and writes `products/receipts/SENTRY_FINDINGS_FEED.<id>.json`
  (solution-mandatory: `without_solution` must be 0). Fail-closed: any layer that ran
  and did not pass fails the gate; layers whose required env is absent are DEFERRED
  (never faked) so full proof requires running on prod with creds.

Registered at ratification: `site-builder` (delegates to the proven composite gate),
`lifeos-founder-ui` (Layer B = real-app E2E — the founder chat/drawer/build). New
products are onboarded by adding a registry entry, not by writing a new gate.

10. A product is not "generalized-complete" until it appears in the registry AND its
    gate has run fully-satisfied (all layers ran and passed) on prod.

## Provenance

- Layer A: PR #280. Layer B: PR #281. Content-truth guard: PR #282.
- Editor iframe fix the gate was built to catch: PR #279.
- Solution-mandatory amendment: PR #286. Self-fix closer: PR #287–#288.
- Generalization engine + registry (all products): this PR.
