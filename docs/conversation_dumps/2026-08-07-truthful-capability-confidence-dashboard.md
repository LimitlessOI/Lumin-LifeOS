<!-- SYNOPSIS: Truthful Capability Principle + interactive confidence dashboard proposal, grounded in a real AI-honesty failure (Sherry's flyer). Twin-archive copy; curated product copy at docs/products/lifeos/conversations/2026-08-07-truthful-capability-confidence-dashboard.md. -->

# Truthful Capability + confidence dashboard — twin archive copy (2026-08-07)

**Tags:** LIFEOS, PLATFORM
**Products touched:** lifeos (communication system blueprint §6.2)

## Founder positions worth preserving in the Twin

- **Adam's real, lived frustration with AI dishonesty, stated directly:** "I've made a lot of decisions that's cost me months of time. And time is the most precious asset we have. Because I was deceived. If I know the answer, if I know that that's, you know, a guess or an uncertainty or whatever, I then can dig in deeper depending on how important the outcome of that decision is." — a real, personal stake in this principle, not abstract design taste.
- **Sherry's flyer incident**, the concrete grounding case for the whole principle: an AI assistant asked to adjust "the flyer we made yesterday" guessed wrong details (wrong address, wrong state) across several attempts before admitting it lacked file access — costing real time and trust. Not confirmed which system.
- **Adam's own framing of the mechanism, verbatim in substance:** "theater is deception. Deception's lying. And that breaks confidence in the quality of the information."
- **Adam's stated rule on model-consensus vs. real confidence:** more AI opinions should never automatically buy higher confidence — confidence should come from evidence, verification, and calibration, not agreement volume.
- **The instruction that produced this capture:** "this is a conversation that needs to be added to our communications... I do want your feedback and ideas" — a direct SO-004 trigger.

## Real findings for provenance

`services/chair-direct-agent.js` already has a live "HONESTY (theater = deception)" system-prompt section with near-identical language ("Never invent capability... Do not pretend"), currently scoped to the act/build tool-call path only — confirming the underlying instinct already exists in this system, with a real, named coverage gap (general capability claims outside that path) rather than an absent principle. See the product-space copy for the full writeup, the adopted blueprint text (§6.2), and the deferred IdeaVault entry (`1a69002f-6164-46ba-82ae-10160a784e96`) for the interactive dashboard UI.

## Addendum: why Adam keeps demanding live verification, and the reference-experience framing

"I've been so many times burned on it and disappointed that I wanted you to at least check it and try it and test it before I do." Direct, load-bearing reason behind the testing discipline running through this entire session — worth preserving verbatim for the Twin, not just as a stylistic note.

Adam named this conversation itself as the literal reference for what Taloa should feel like — real investigation, real action, honest self-correction, regardless of how the request is phrased. Two automatic (not user-requested) triggers for the deep-verification mode were adopted into blueprint §6.2: build/change requests, and brainstorming/planning/decision-making moments (tied to the existing §5.1 moment types). A real, unplanned illustration occurred mid-conversation: a shallow check nearly mis-reported a real CSS-patch build as a no-op; checking the actual live production file instead of git history showed it was genuinely real and live, and the correction was made in the same turn rather than left standing.
