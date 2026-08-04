<!-- SYNOPSIS: LifeOS — 2026-08-04 founder naming proposal: Digital Imprint vs. Digital Twin (NOT ADOPTED, no rename applied) -->

# Digital Imprint / Digital Twin naming proposal (2026-08-04)

**Intake source:** founder brainstorm, part of the same session as the LegacyOS/MediaOS Founder Vision Brief.
**Verbatim master:** [`docs/conversation_dumps/2026-08-04-legacyos-mediaos-imprint-vision.md`](../../../conversation_dumps/2026-08-04-legacyos-mediaos-imprint-vision.md), Part 3.
**Status: PROPOSAL ONLY — NOT ADOPTED.** No live field, table, service name, or spec has been renamed. `services/lifere-twin-store.js` and `docs/products/builderos/specs/FOUNDER_VIRTUAL_TWIN.md` remain "Digital Twin," unchanged, until/unless Adam actually ratifies this.

---

## The proposal

Adam, verbatim: "I don't like the Legacy Twin. I love the word legacy, but I don't like twin... Imprint. Your legacy imprint when you pass away. And right now, it's your digital imprint. What do you think about that?"

The reasoning offered: a **twin** implies *another you*; an **imprint** implies *the mark you left behind* — closer to what the Twin system is actually trying to represent, and reads as less unsettling once a person has died ("people don't inherit your twin, they inherit your imprint").

**Proposed two-layer split**, replacing a single overloaded "Digital Twin" concept:

| Term | Meaning | Lifecycle |
|---|---|---|
| **Digital Imprint** | The living, evolving record — memories, conversations, preferences, values, thinking patterns, decisions, growth, relationships | Continuously updated during life |
| **Digital Twin** | The *active reasoning model* built from the Imprint — the thing that actually assists, coaches, organizes, remembers, creates | Continuously updated during life; stops evolving at death |
| **Legacy Imprint** | The preserved record after death | Frozen, inheritable |
| **Historical Imprint** | An Imprint voluntarily donated to a research/historical archive | Frozen, donated |

Shorthand offered: **"The Imprint is the library. The Twin is the librarian."**

## How this maps to what's actually real in this repo today

Checked against the live system before recording this, not just filed as-is:

- The real, live Twin store is `services/lifere-twin-store.js` — founder-only today, per this session's own earlier notes on the Creative Engine plan ("founder-only, demo-thin today, needs client generalization").
- The canonical spec is `docs/products/builderos/specs/FOUNDER_VIRTUAL_TWIN.md` — status `CANONICAL SPEC (implementation partially started)`.
- Today's real system does **not** actually separate "the accumulated record" from "the active reasoning model" as two distinct named things — it's one `Twin` concept doing both jobs. The proposed Imprint/Twin split isn't just a rename; it's naming a real seam that may or may not already exist implicitly in the current implementation. That's worth checking directly against `lifere-twin-store.js`'s actual schema before this goes any further — this document does not claim that check has been done yet.

## What this is NOT

- Not an instruction to rename `services/lifere-twin-store.js`, any database column, or any live API field.
- Not a ratified addition to `FOUNDER_VIRTUAL_TWIN.md` — that spec is unchanged.
- Not connected to the Cognitive Interaction Architecture proposal (`docs/constitution/proposals/2026-08-04-COGNITIVE-INTERACTION-ARCHITECTURE-PROPOSAL.md`) — different document, different scope, cross-referenced here only because both are 2026-08-04 LifeOS-adjacent proposals so a future reader doesn't confuse them.

## If this is ever pursued

The real first step is the one named above and not yet done: read `lifere-twin-store.js`'s actual data model and confirm whether "accumulated record" vs. "active reasoning model" is already a real internal seam (in which case this is a naming clarification) or would require an actual schema/architecture change (in which case it's a much bigger decision than a rename, and should go through the same proposal-and-ratify discipline as everything else in `docs/constitution/proposals/`). Not attempted in this pass — recorded as the next concrete step, not solved here.

@ssot docs/products/lifeos/PRODUCT_HOME.md
