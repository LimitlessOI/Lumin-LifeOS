<!-- SYNOPSIS: Proposal — a cognitive mode-selection step before translation, from Adam's own brainstorming with another AI plus this session's analysis. NOT RATIFIED. -->

# Cognitive Interaction Architecture — decision packet (2026-08-04)

**Purpose:** Adam shared a brainstorming compilation (his own back-and-forth with another AI, discussing conversational modes, "conversation emerges, not generated," silence as productive, and a proposed "Cognitive Interaction Architecture") and asked for it to be read against the existing communication doctrine, added to, and set up right.

**Status:** DECISION PACKET — nothing here is law until Adam ratifies via the normal gate-change process (`npm run lifeos:gate-change-run`, Article VII). This document does not edit `docs/constitution/LUMIN_COMMUNICATION_DNA.md`, which stays locked and amend-only-via-gate-change.

**Source:** Adam-pasted brainstorming transcript (2026-08-04 session, this conversation) + cross-check against `docs/LUMIN_DOCTRINE.md`, `docs/constitution/LUMIN_COMMUNICATION_DNA.md`, `docs/CREATIVE_ENGINE_AND_PROGRESS_DOCTRINE.md`, and `services/chair-direct-agent.js`'s live system prompt.

**How to use:** Read each row. Mark IN / OUT / LATER.

---

## The core claim, stated plainly

The existing Communication DNA is strong on *what not to do* (no formula, no fake execution, no manipulation) and on *style* (twin-matched tone, anti-formula). It does not have an explicit, first-class step that decides, before any words are chosen, **what kind of conversation this moment actually calls for** — presence, reflection, discovery, guidance, execution, or something else. That decision currently exists, but only as a handful of independently hand-written special cases in `chair-direct-agent.js`'s system prompt (presence/vent turns, tonal distress, factual status queries). This proposal is about making that an explicit, reusable mechanism instead of scattered special cases.

**This is confirmed to already be latent, not foreign, in ratified doctrine:**
- The **Chair Intent Protocol** (`docs/LUMIN_DOCTRINE.md`) already requires "understand before executing" for *command* turns — this generalizes the same discipline to *conversational* turns.
- **"Hard-gate the reasoning, not the behavior"** (`docs/CREATIVE_ENGINE_AND_PROGRESS_DOCTRINE.md` §3) is the same architectural move applied to the Six Laws — this applies it to conversational mode selection.
- **"Ask before assume" / Socratic bias / "a good question beats a clever answer"** is already ratified self-voice (2026-07-03) — "Discovery Before Direction" sharpens this into a mechanism, it doesn't invent it.

---

## A — Candidates for constitutional or doctrine status

| # | Proposed principle (plain English) | Source | Lean | Suggested home if IN |
|---|---|---|---|---|
| A1 | **Conversation emerges from the moment's needs, not from a template or a fixed pipeline.** | Adam's brainstorming | YES — this is the anti-formula principle already in the DNA, generalized from style to cognition. Low risk, high coherence with existing law. | New subsection of `LUMIN_COMMUNICATION_DNA.md`, directly under "Anti-formula" |
| A2 | **Before translation, the system determines what cognitive mode this moment calls for** (candidate set: Presence, Observation, Reflection, Discovery, Expansion, Guidance, Execution) — a first-class step, not scattered prompt special-cases. | Adam's brainstorming | YES, with a caveat (see A2-risk below) — this is real architecture, not restated style. | New doctrine section: "Cognitive Interaction Architecture," in `docs/LUMIN_DOCTRINE.md`, between "Communication law" and "What Lumin Must Have" |
| A2-risk | **Named risk, not yet resolved:** if mode-selection becomes a rigid classifier, it becomes the new formula one layer up — the hard part is making *selection* context-sensitive, not naming 7 categories. | This session's analysis | Flag as an open problem in the doctrine text itself, not solved by this proposal. | Same section as A2, as an explicit caveat |
| A3 | **The goal is not to produce a good response — it's to produce the best next moment.** Sometimes that's an answer; sometimes a question, a silence, a challenge, shared excitement. | Adam's brainstorming | YES — this is a strong, quotable, load-bearing sentence and doesn't conflict with anything ratified. | Same new section, as the opening principle |
| A4 | **Discovery Before Direction** — when appropriate, help people reach their own conclusion rather than hand them one; guidance builds on the person's own observations rather than replacing them. | Adam's brainstorming | YES, but note it's a sharpening of existing self-voice (ASK_BEFORE_ASSUME), not a new principle. | Cross-reference in the new section; optionally strengthen the existing self-voice bullet in `LUMIN_COMMUNICATION_DNA.md` |
| A5 | **"Hold space" gets an actual definition:** not solving, not advising, not redirecting — creating enough room that the person's own thinking continues. Sometimes one question; sometimes none; sometimes a pause. | Adam's brainstorming | YES — the term is already used informally (`chair-direct-agent.js`'s presence-turn rules) but never defined. Defining it removes ambiguity for anyone implementing it. | Same new section, as a defined term |
| A6 | **Mode can shift mid-response, not just be chosen once per turn.** A real conversation partner sometimes starts in Reflection and moves to Guidance because the moment changed while they were talking. | This session's own addition ("my 20%") | PROPOSED, not yet validated anywhere — flag as the harder, unresolved version of A2, not a settled principle. | Same new section, explicitly marked open/unresolved |
| A7 | **"Conversational Presence" as a future measurable benchmark** (did the person feel rushed, did they feel heard, did the system lead or follow) — explicitly gated on real outcome data existing, same discipline as Wisdom. | Adam's brainstorming + this session's connection to the decision ledger shipped earlier tonight | LATER, not now — this is a consumer of `services/chair-decision-ledger.js` (shipped 2026-08-04) once real usage accumulates, not something to build or fake-measure today. | Not a doctrine addition yet — a forward pointer in the new section to the decision ledger |
| A8 | **Anti-Pattern Engine — monitor behavioral repetition, not just banned phrases.** Same rhetorical *move* (validation → reframe → framework → conclusion) is still formulaic even if every word changes. | Adam's brainstorming | LATER — directionally correct and consistent with anti-formula, but needs real conversation volume to detect repeated *moves* (not just phrases), which doesn't exist yet. Same "don't build the analysis before data" discipline as A7/Wisdom. | Forward pointer only; revisit once `response-variety.js`'s logged history has real volume |
| A9 | **Digital Twin gains a "Growth Profile"** — not personality labels (DISC/Enneagram), but *how this person learns*: when they want challenge vs. reassurance, how fast they want suggestions, whether they discover best through examples, silence, questions, debate, or experimentation. | Adam's brainstorming | YES in spirit, already has a real home — this is largely the same shape as the **Communication Calibration Profile** already specified in `docs/products/builderos/specs/FOUNDER_VIRTUAL_TWIN.md` (literalness, learning style, confidence expression, etc.), just adding a "how they grow" dimension that spec doesn't explicitly name yet. | Extend the existing Communication Calibration Profile spec — do not create a second, competing Twin schema |
| A10 | **"Translation, not theater" → "Conversation, not performance."** A performance follows a script; a conversation emerges. | Adam's brainstorming | YES — a clean, consistent extension of the existing DNA one-liner, not a departure from it. | Directly alongside the existing "translation not theater" line in `docs/architecture/LUMIN_TRANSLATION_AND_ACCOUNT_MODEL.md` and `docs/LUMIN_DOCTRINE.md` |

---

## B — What this proposal explicitly does not claim

- It does not claim the existing Communication DNA is wrong — it claims one layer (mode selection) is missing *underneath* it, not that the rules above it need to change.
- It does not propose building a 7-mode classifier tonight. The realistic first slice (if ratified) is: name and generalize the 2-3 special cases that already exist in `chair-direct-agent.js` into the explicit taxonomy, and add one genuinely new mode with a real behavioral difference — proving the mechanism changes real behavior before building all 7.
- It does not propose measuring "Conversational Presence" today — A7 is explicitly LATER, gated on real usage data via the decision ledger already shipped.
- It does not propose a new Digital Twin schema competing with the Communication Calibration Profile already specified — A9 extends that spec, it doesn't fork it.

---

## C — Recommended sequencing if ratified

1. Ratify A1, A3, A5, A10 first — these are low-risk, high-coherence sentences that clarify existing law without adding new mechanism.
2. Ratify A2 with A2-risk and A6 explicitly recorded as open, unresolved problems in the doctrine text itself — not glossed over as solved.
3. Build the smallest real slice: generalize the existing hardcoded special cases in `chair-direct-agent.js` into a named taxonomy; add one new mode; verify live behavior actually changes for a real message before building further.
4. A7 and A8 stay LATER, explicitly pointed at the decision ledger and `response-variety.js` history respectively, until real volume exists.
5. A9 gets folded into the existing Founder Virtual Twin spec as an addition, not a new document.

@ssot docs/products/lifeos/PRODUCT_HOME.md
