<!-- SYNOPSIS: LifeOS — 2026-08-06 founder naming proposal: "Solomon" for Wisdom + institutional history/lessons functions (NOT ADOPTED, no rename applied) -->

# "Solomon" naming proposal (2026-08-06)

**Intake source:** founder brainstorm, same session as the voice-to-text / STT fallback fix and the fluid-UI / model-tier capture.
**Status: PROPOSAL ONLY — NOT ADOPTED.** No file, table, doctrine heading, or service has been renamed. `docs/LUMIN_DOCTRINE.md`'s "Wisdom — The Pattern Intelligence Role" section is unchanged.

---

## The proposal

Adam, verbatim: "That's what I've renamed our wisdom. history, all those kind of functions." — said in the context of proposing that a role named "Solomon" (rather than "Chair") direct/examine web research and institutional lessons when BuilderOS authors a blueprint.

So **Solomon = Adam's proposed rename for "Wisdom" plus the institutional-history/lessons functions**, collectively — not a new system, not a new capability, a naming change over what already exists (mostly conceptually; see below for what's actually real today).

## What this would actually rename, checked against the real repo before recording it

"Wisdom" and "history" are not one thing in this repo today — they're at least three separate, real-or-conceptual things, and the proposal should be understood as covering some but likely not all of them:

1. **`docs/LUMIN_DOCTRINE.md` §"Wisdom — The Pattern Intelligence Role"** (line 205) — the doctrine-level role: studies accumulated conversations, tracks prediction accuracy, measures against real outcomes, surfaces recurring patterns. This is almost certainly the primary thing "Solomon" is meant to rename. **Status: conceptually defined, deliberately not fully built** — its real backing store, `chair-decision-ledger.js` / `decision_outcome_ledger`, had only 6 seeded predictions as of 2026-08-04 (per this session's own earlier Priority 5 work), explicitly below the sample floor needed to trust any calibration claim.
2. **The `lessons_learned` Postgres table** (`db/migrations/20260704_create_lessons_learned.sql`) — real, queryable, genuinely populated, but thin: 10 rows, seeded once 2026-05-14, not grown since, all confidence medium/low, explicitly not promoted to fact/law. Read live by `services/memory-intelligence-service.js`, `services/lumin-context-loader.js`, and `scripts/generate-cold-start.mjs`. This is the closest thing to "history" that a research step could realistically query today.
3. **`services/mastery-tracker.js`'s `wisdom_entries` table / `extractWisdom()` / `searchWisdom()`** — a real, separate, already-shipped feature for personal skill-mastery practice (deliberate-practice protocols, plateau detection, a personal wisdom library extracted from practice sessions). This is very likely **not** what Adam means by "our wisdom, history" in this context (it's about personal skill practice, not institutional/organizational lessons) — flagged explicitly so a future rename doesn't accidentally sweep in an unrelated feature that already uses the word "wisdom" for something else.

**Recommendation if this proceeds:** "Solomon" should map to items 1 and 2 (the doctrine role + the lessons_learned store) — not item 3. Confirm this scoping with Adam before any rename is applied, precisely because the word "wisdom" is already overloaded in this repo and a rename needs to be specific about which of the three it covers.

## Why nothing was renamed yet

Same discipline as every other naming proposal this session (Digital Imprint/Twin, LegacyOS/Legacy Imprint): a rename proposal gets recorded and cross-referenced, not silently applied to locked doctrine or live schema. `docs/LUMIN_DOCTRINE.md` is explicitly "Founder-specified... Non-negotiable" at its own header — renaming a section heading there is a real doctrine change, not a drive-by edit, and should go through the same gate-change process other doctrine edits do if Adam wants to proceed.

## Where this connects to the current work

This proposal surfaced while discussing blueprint-drafting research: the plan on the table is a cheap/funded model collecting web research + querying `lessons_learned` in parallel with other work, with **Chair** (the real, already-live synthesis role) examining the results when drafting acceptance criteria. If "Solomon" is adopted as the name for the Wisdom-role-plus-lessons layer, the architecture doesn't change — Chair still does the examining; Solomon becomes the name for the memory layer Chair reads from, not a second reasoning role competing with Chair.

@ssot docs/products/lifeos/PRODUCT_HOME.md
