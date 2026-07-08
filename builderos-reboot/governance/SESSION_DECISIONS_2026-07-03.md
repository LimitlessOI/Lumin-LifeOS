<!-- SYNOPSIS: BuilderOS governance — decisions/laws ratified in the 2026-07-03 founder session -->

# BuilderOS Session Decisions — 2026-07-03

Canonical record of the **decisions and laws** ratified with the founder on 2026-07-03.
Ideas/brainstorm live in the vault (`docs/products/ideavault/conversations/2026-07-03_twin-evolution-and-integrity-auditor.md`);
the chronological story lives in `docs/CONTINUITY_LOG_LIFEOS.md`.

---

## SO-003 — never idle on tokens; never cheap on the most-important function (founder-ratified)

Committed to `CLAUDE.md`. Two coupled rules:
1. **Auto-failover, never idle.** If a model errors or exhausts tokens, the system
   automatically switches to another (strong) model. It must never sit idle because one
   provider ran dry. The **only** hard stop is the daily budget cap; raise it only once ROI
   is proven. Implemented in `defaultPlannerCallModel` (Anthropic→OpenAI→Gemini across
   present keys).
2. **No cheap AI on the most-important functions.** High-stakes reasoning — the Chair
   debate/counsel channel and the (future) integrity auditor — must auto-escalate to a
   strong model, and must never be served a canned/templated non-model answer. Observed
   live: `modelRoutingForChannel` marks the `chair` channel `estimated_cost_tier:"cheap"`
   and `chair-lumin-unified.js` can short-circuit to a canned template via
   `needsSystemKnowledge`/`shouldUseDirectProgramAnswer` — that is the fix target.

## Integrity Auditor — Chair-debated ranked build order

The "1% lie" watchdog: a separation-of-powers audit brain that catches hallucination/
drift/the load-bearing sliver of falsehood before it compounds. Chair debate (Consensus
Ledger row 6) hardened the design:

- The primary control is **structural**: the auditor sees the builder's **claims +
  receipts, never its chain-of-thought** (model-family independence is only a second-order
  hedge).
- Receipts must be **typed** (build ≠ test ≠ deploy) — a valid-looking SHA is not proof of
  correctness.
- Needs an **immutable append-only evidence log** (else receipts get retroactively edited).
- Auditor needs **COMPEL power**, not just veto (writ-of-mandamus if the builder infinitely
  defers).
- Drift tripwire is gamed by claim-flooding (count only **ship-gating** claims) and
  claim-splitting (track **claim lineage**); the threshold is a **tighten-only ratchet**
  (loosening requires a logged founder override).
- Chair's better detector — **Dead-Reckoning Audit**: every N cycles reconstruct system
  state from receipts alone and diff against asserted state; the gap **is** the 1-degree
  error. No threshold, catches lies of **omission**.

**Ranked build order:** (1) claim-receipt verifier at deploy time (every `live`/`PASS`/
`committed:true` must carry a `receipt_id` that resolves or auto-downgrades to UNVERIFIED);
(2) immutable append-only evidence log; (3) Dead-Reckoning Audit on a schedule. Governance
layer on top: drift tripwire + executive/judicial/legislative check-and-balance.

**Status:** parked until the loop finishes proving itself on the 4 rank-8 lifeos defects.

## Twin-system rulings (competitive evolution)

- In **production**, a peer twin **audits + proposes a full solution** (as if it owned it),
  but **never edits the other twin's live env**. Accountability + anti-sabotage.
- **Direct cross-repair happens only in a sandboxed A/B competition**, where nothing live
  is at risk and the goal is learning.
- The proposed solution is **debated between finder and owner → consensus**, aiming for a
  synthesized **C/D** (not just "A beats B"). Consensus makes better decisions, not just a
  winner.
- **Token discipline:** twins debate in reasoning/prose first; generate code only to
  clarify a point or once there is consensus on the approach.
- **Audit cadence is event-driven** (every load-bearing claim at ship time) **+ a scheduled
  Dead-Reckoning sweep** — never occasional/random.

**Status:** parked design (post-bug); to be specced with the Chair. Composer 2.5 is now a
consensus partner in the loop.

## Standing gate reaffirmed

Confer with the Chair and seek consensus **before** strategic decisions (hard gate), and
track — in `docs/governance/CHAIR_CONSENSUS_LEDGER.md` — whether conferring reaches the
right decision faster. Founder: "This should be happening on most decisions." The dangerous
decisions are the ones the system makes implicitly (which model, what "done" means, whether
to ship) — surface those up to the debate.

## Prod outage + hardening (this session)

The autonomous loop authored `db/migrations/20260420_lifeos_phase2_schema.sql` with
`habit_logs.habit_id uuid REFERENCES habits(id)`; a legacy `habits` table already exists
with `id integer`, so the FK "cannot be implemented", the migration threw, `initDatabase`
re-threw, and founder-runtime boot aborted before route registration → every route 404.
Fixed in **PR #307**: drop the FK, and — the durable lesson — a non-idempotent migration
failure no longer aborts boot (log loudly, leave unapplied to retry, continue registering
routes). One bad migration can degrade a feature, never take down the whole server.
