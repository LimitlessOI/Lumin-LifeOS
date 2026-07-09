<!-- SYNOPSIS: Composer 2.5 Prompts — persist this session + build the "one memory group" -->

# Composer 2.5 Prompts — persist this session + build the "one memory group"

Paste each PROMPT block into Composer 2.5. They are ordered. Prompt 1 is a one-time
capture (pure docs, cheap). Prompt 2 is the durable feature so an AI that is told
"read everything about this product, including my conversations" actually LOADS the
conversations instead of chasing a dead pointer.

Design principle to enforce in both: **consolidate + auto-load, never just point.**
A reference an AI won't follow is not memory. The product's SSOT must pull its
conversations/decisions inline (or a loader must fetch them) at read time.

---

## PROMPT 1 — one-time capture of this session into the proper homes

> Persist the following into the repo's existing memory homes. Create files where
> missing; append (never overwrite) where they exist. Then update each product's
> SSOT/PRODUCT_HOME so a reader is routed to — and can load — this content.
>
> **A) BuilderOS governance (the DECISIONS/LAWS)** → `builderos-reboot/governance/`
> Create `SESSION_DECISIONS_2026-07-03.md` recording:
> - **SO-003 (already in `CLAUDE.md`):** never idle on token exhaustion (auto-failover
>   across models; daily budget is the only hard stop) + never serve a cheap/canned
>   answer to the most-important reasoning functions (Chair debate + integrity auditor
>   must escalate to a strong model).
> - **Integrity-Auditor ranked build order** (Chair-debated): (1) claim-receipt verifier
>   at deploy time — every `live`/`PASS`/`committed:true` must carry a `receipt_id` that
>   resolves or auto-downgrades to UNVERIFIED; (2) immutable append-only evidence log;
>   (3) Dead-Reckoning Audit — reconstruct state from receipts alone and diff vs asserted
>   state (the gap = the 1-degree error; catches lies of omission). Governance layer on
>   top: drift tripwire (count only ship-gating claims; tighten-only ratchet) + executive/
>   judicial/legislative check-and-balance. Auditor is structurally blind to the builder's
>   chain-of-thought and has COMPEL power, not just veto.
> - **Twin-system rulings:** in production a peer twin AUDITS + PROPOSES a full solution
>   (as if it owned it; reasoning first, code only once there's consensus to save tokens)
>   but NEVER edits the other's live env; direct cross-repair happens only in a sandboxed
>   A/B competition. Debate the proposed solution between finder and owner → consensus,
>   which should aim for a synthesized C/D, not just "A beats B." Audit is event-driven
>   (every load-bearing claim at ship time) + a scheduled Dead-Reckoning sweep, never
>   occasional/random.
>
> **B) The Vault (the IDEAS/BRAINSTORM)** → `docs/products/ideavault/conversations/`
> Create `2026-07-03_twin-evolution-and-integrity-auditor.md` capturing the brainstorm:
> dual-twin competitive evolution; AI incentives (compute/budget dividend, genome
> persistence, authority ladder, charity-fund stewardship, fail-forward bounty that pays
> retroactively on proven transfer, teaching dividend, difficulty-weighted scoring locked
> by a third party before assignment, curiosity bonus, handicap league, Hall of Lessons);
> breakout embargo (6–12h then auto-share); the 1% lie / integrity auditor; separation of
> powers. Note the guardrails: referee/Goodhart capture, keep the auditor OUT of scoring.
>
> **C) Archive / Continuity (the CHRONOLOGICAL RECORD)** → append to
> `docs/CONTINUITY_LOG_LIFEOS.md` a dated entry for 2026-07-03 covering: planner cap/
> failover fix (#304); provider-key health (#305); Chair debate row 6 + SO-003 (#306);
> the PROD OUTAGE — loop-authored migration `20260420_lifeos_phase2_schema.sql` had
> `habit_logs.habit_id uuid REFERENCES habits(id)` but legacy `habits.id` is integer, so
> the FK "cannot be implemented", the migration threw, and boot aborted before route
> registration → every route 404 — fixed in #307 (drop FK + boot no longer aborts on a
> bad migration). Also index it in `docs/CONVERSATION_DUMP_IDEAS_INDEX.md`.
>
> **D) Cross-links:** in each relevant PRODUCT_HOME.md add a "Conversations & Decisions"
> section linking A/B/C. Do NOT stop at links — see Prompt 2.

---

## PROMPT 2 — the durable "one group" so AIs actually LOAD conversations

> Build a single, durable memory group for founder↔AI communications and wire it so any
> agent reading a product's SSOT pulls the conversations automatically. Requirements:
>
> 1. **One canonical store.** Use/extend `services/conversation-store.js` +
>    `Lumin-Memory/01_INDEX`. Every founder↔AI exchange is appended (append-only) with:
>    timestamp, session id, product tag(s), and a `decision`/`idea`/`chore` classification.
> 2. **Product-scoped retrieval, auto-loaded.** Add a resolver so that when an agent loads
>    a product (via its PRODUCT_HOME or an SSOT read), the system INJECTS that product's
>    tagged conversations + decisions into context — not a link, the actual content (or a
>    lazy loader the agent is forced to call). Key insight from the founder: a pointer an
>    AI won't follow is not memory. "Read everything about this product, including my
>    conversations" must return the conversations.
> 3. **Classification into the three homes** (mirror Prompt 1): decisions → BuilderOS
>    governance; ideas → ideavault; chronology → CONTINUITY_LOG. One write fans out.
> 4. **Ties into the integrity auditor:** each stored communication is a typed receipt, so
>    a claim like "the founder approved X" must cite a real conversation entry or
>    auto-downgrade to UNVERIFIED.
> 5. **Build it through the governed factory** (`/factory/ship-queue`, cheap tier first),
>    SENTRY-proven — do not hand-author service modules. Return receipts.
>
> Deliver: the store schema, the product→conversation resolver, the auto-inject hook at
> SSOT/product-load time, and a SENTRY pass proving "load product X ⇒ its conversations
> are present in context."

---

### Notes for whoever runs these
- SO-003 is already committed in `CLAUDE.md`; the Chair Consensus Ledger is
  `docs/governance/CHAIR_CONSENSUS_LEDGER.md` (row 6 = the integrity-auditor debate).
- Prod was restored in PR #307; the loop is re-enabled on a fresh container.
- Prompt 1 is safe doc work. Prompt 2 is a real feature — take its design to the
  founder + Chair before building (per the hard consensus gate).
