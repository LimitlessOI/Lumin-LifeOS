<!-- SYNOPSIS: Decision record — Build the BuilderOS Collaboration Spine -->

# DECISION-0002 — Build the BuilderOS Collaboration Spine

**Decision ID:** `DECISION-0002`  
**Mission / Blueprint:** Mission 2 — BuilderOS Convergence / `FACTORY-BUILDEROS-CONVERGENCE-0001`  
**Blueprint version:** `FACTORY-BUILDEROS-CONVERGENCE-0001-v2`  
**Decided at:** 2026-07-31T06:00:00Z  
**Authority:** `builderos-reboot/DECISIONS/DECISION-0002.md`  

---

## Decision

Build a minimal, artifact-driven Collaboration Spine so every AI and human reads and writes the same decision chain instead of summarizing context in chat.

## Founder intent

Adam should never again become the communications bus between AI systems. Every finding, decision, and handoff must live in a durable, verifiable artifact.

## Problem being solved

Multiple agents (Devin, Claude Code, ChatGPT, Cursor) currently repeat audits, lose context, and ask Adam “what happened yesterday?” This burns founder hours and produces inconsistent decisions.

## Alternatives considered

| Alternative | Pros | Cons | Why rejected / chosen |
|---|---|---|---|
| Real-time multi-agent chat room | Familiar, fast | No durable SSOT, no proof, founder still the router | Rejected per FOUNDER_PACKET non-goals |
| Single shared Google Doc | Easy to read | No schema, no machine validation, no linking to code | Rejected — not mechanical enough |
| Markdown decision files + verifier/assembler | Durable, versioned, machine-validatable, git-backed | Requires a small amount of convention | **Chosen** — smallest mechanical artifact that meets the intent |

## Per-role reasoning

- **Chair:** The Spine must be small and artifact-first. A structured Markdown/JSON artifact with Mission → Evidence → Reviewer → Challenges → Consensus → Decision → Receipt → Next is enough to start. No chat room, no real-time API.
- **Architect:** Use `builderos-reboot/DECISIONS/DECISION-XXXX.md` as the canonical form, `DECISION_RECORD_TEMPLATE.md` as schema, `scripts/verify-decision-record.mjs` as the validator, and `scripts/collaboration-spine-assemble.mjs` to produce the chain artifact.
- **Sentry:** The verifier must fail closed if a decision record is missing required sections. The assembler must produce a deterministic output orderable by decision ID.
- **Wisdom:** This pattern mirrors `DECISION-0001.md` and `MISSION_2_CONVERGENCE_HANDOFF.md` which already proved context preservation works. Reuse, don't reinvent.
- **CFO:** Cost is near-zero: text files and scripts. The leverage is high because it reduces founder-intervention hours per mission.

## Assumptions

1. Markdown headings are stable enough to act as a schema for now.
2. Decision IDs are sequential `DECISION-XXXX` strings.
3. `git` is the source of truth for ordering and versioning.

## Predictions

1. After this decision, a new agent can start a mission by reading the latest `COLLABORATION_SPINE.md` and the relevant `DECISION-XXXX.md` files instead of asking Adam.
2. `verify-decision-record.mjs` will catch incomplete or malformed decision records before they are accepted.

## Success criteria

- [ ] `DECISION_RECORD_TEMPLATE.md` exists and defines all required fields.
- [ ] `DECISION-0002.md` is valid per `verify-decision-record.mjs`.
- [ ] `scripts/verify-decision-record.mjs` and `scripts/collaboration-spine-assemble.mjs` exist and have passing tests.
- [ ] `npm run builder:preflight` passes after the changes.

## Failure criteria

- If agents still ask Adam for mission context, the Spine is not being used.
- If `verify-decision-record.mjs` accepts a missing-section record, the schema is not enforced.

## Consensus

All roles converge on a small Markdown/JSON artifact system. Real-time chat and shared docs are rejected as insufficiently mechanical and durable.

## Why this decision

It directly addresses the founder intent with the smallest possible surface, is immediately verifiable, and makes Mission 3 dramatically easier by preserving reasoning artifacts.

## Implementation trace

- `builderos-reboot/DECISIONS/DECISION_RECORD_TEMPLATE.md`
- `builderos-reboot/DECISIONS/DECISION-0002.md`
- `scripts/verify-decision-record.mjs`
- `scripts/collaboration-spine-assemble.mjs`
- `tests/decision-record.test.js`
- `docs/products/builderos/PRODUCT_HOME.md` change receipts
- `docs/CONTINUITY_LOG.md`

## Sentry verification

- `node --test tests/decision-record.test.js` PASS 4/4.
- `node scripts/verify-decision-record.mjs builderos-reboot/DECISIONS/DECISION-0002.md` exits 0.
- `node scripts/collaboration-spine-assemble.mjs` produces `builderos-reboot/DECISIONS/COLLABORATION_SPINE.md` and `COLLABORATION_SPINE.json` with 2 valid decision records.

## Actual real-world outcome

The Collaboration Spine shipped as part of Mission 2 P2. `DECISION_RECORD_TEMPLATE.md` defines required sections; `verify-decision-record.mjs` validates them; `collaboration-spine-assemble.mjs` produces a deterministic `COLLABORATION_SPINE.md` ordered by decision ID. Both `DECISION-0001.md` and `DECISION-0002.md` are valid. The spine is small, artifact-first, and git-backed rather than a chat room.

## Prediction-versus-reality comparison

- Prediction 1: A new agent can start by reading the spine and relevant decisions. Reality: `COLLABORATION_SPINE.md` now exists at `builderos-reboot/DECISIONS/COLLABORATION_SPINE.md` and references each decision, mission pack, and handoff artifact. Not yet measured in a new-agent cold start, but the artifact is the durable source.
- Prediction 2: `verify-decision-record.mjs` will catch malformed records. Reality: `tests/decision-record.test.js` confirms it rejects missing sections and accepts complete records.

## Resulting lessons / wisdom update

Markdown headings are a stable enough schema for now; the verifier and assembler give it mechanical enforcement. For Mission 3, consider adding decision-to-code traceability (each decision links to the committed files it authorized) so Wisdom can compute drift automatically.

## Reality judgment

- **Status:** `CONFIRMED`
- **Evidence:** `node scripts/verify-decision-record.mjs builderos-reboot/DECISIONS/DECISION-0002.md` exits 0; `node scripts/collaboration-spine-assemble.mjs` writes the spine with 2 valid records; `node --test tests/decision-record.test.js` PASS 4/4; `npm run builder:preflight` PASS 416/416.
- **Next action:** Use the Collaboration Spine as the canonical handoff artifact for Mission 3 scoping.
