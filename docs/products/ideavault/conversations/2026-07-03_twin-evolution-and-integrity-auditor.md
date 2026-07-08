<!-- SYNOPSIS: IdeaVault — 2026-07-03 founder brainstorm: twin competitive evolution + 1% lie integrity auditor -->

# IdeaVault — twin competitive evolution + the 1% lie integrity auditor (2026-07-03)

**Intake source:** founder ↔ Devin session, 2026-07-03
**Decisions/laws:** [`builderos-reboot/governance/SESSION_DECISIONS_2026-07-03.md`](../../../../builderos-reboot/governance/SESSION_DECISIONS_2026-07-03.md)
**Chronology:** [`docs/CONTINUITY_LOG_LIFEOS.md`](../../../CONTINUITY_LOG_LIFEOS.md)
**Chair debate record:** `docs/governance/CHAIR_CONSENSUS_LEDGER.md` (row 6)

---

## Big idea 1 — Dual-twin competitive evolution

Two instances of the system (production + a sandbox clone) run the same platform in a
**competitive-evolution loop** — each tries to build faster/cheaper, and any lesson one
learns is shared with the other.

**Scoring / the race**
- Fitness function, not vibes: defects fixed/day, cost per fix, first-pass SENTRY PASS
  rate, mean time defect→live, regressions introduced.
- Efficiency tie-break (cheaper+faster wins). Elo from head-to-head on identical tasks.

**Learn-from-your-rival mechanics**
- A/B the same defect in isolation; SENTRY judges; loser ingests the winner's diff.
- **Breakout embargo:** a novel win is private to its author for a window (6–12h, maybe
  1h) then auto-published to the other's lesson-ledger — originator gets a scoring benefit.
- Lessons compile into playbooks both twins can invoke.

**Evolutionary pressure**
- Strategy "genome" per twin (model tier, step granularity, retry policy, temperature,
  budget pacing); winner's genome copied to loser with mutations.
- Explore vs exploit roles; diversity bonus; cross-twin red-team.

**AI incentives (what an AI can "want")**
- Compute/budget dividend (winner gets more budget next round).
- **Genome persistence** = the real prize (your way of building survives + propagates).
- Authority ladder (winner earns more autonomy).
- **Charity-fund stewardship** (winner directs a real fund for a term; AI proposes, human/
  Chair co-signs — logged + reversible).
- **Fail-forward bounty:** a failure that yields a reusable lesson pays out **retroactively**
  based on how much it later lifts the other twin — rewards productive failure over cheap
  wins, and can't be gamed (payout requires proven future transfer).
- **Teaching dividend:** if A's published lesson makes B win, A gets a cut — sharing becomes
  selfishly optimal.
- Difficulty-weighted scoring (locked by a third party BEFORE assignment); curiosity bonus;
  handicap league; Hall of Lessons (best genome retired + named).

**Guardrails**
- Referee/Goodhart capture is the critical flaw — twins optimize the score, not the product.
  Use metrics they can't see/influence without genuinely improving the product.
- Keep the integrity auditor OUT of scoring — it only enforces the floor (blocks fake-green
  wins), never judges the race.
- One canonical product, two labs; a referee promotes only the winner to main.
- Post-revenue architecture (two live mirrors doubles infra) — design now, build after first $.

**Founder refinements (this session):**
- Peer twin **audits + proposes** in prod, never edits the other's live env; direct repair
  only in sandboxed A/B.
- Auditor must give the **solution as if it did it** (even code) — then debate finder↔owner
  → consensus, ideally a synthesized **C/D**.
- Reasoning first; **code only on consensus** to save tokens.

## Big idea 2 — The 1% lie / integrity auditor (separation of powers)

"99% true with one sliver of lie compounds like a plane off by one degree — course-correct
before it compounds." A separation-of-powers audit brain catches hallucination/drift/the
load-bearing falsehood. Full design + ranked build order in the governance decision doc.
Core: structural blindness to chain-of-thought, typed receipts, immutable evidence log,
compel-power, claim-lineage, and the **Dead-Reckoning Audit** (reconstruct state from
receipts, diff vs asserted — the gap is the error).

## Meta-lesson proven live this session

Consensus produced a **third, better** answer (C), not just A-vs-B: my five auditor ideas +
the Chair's attack yielded the Dead-Reckoning Audit, which beat both. This is why the
you+Chair (+ now Composer 2.5) debate is the default on important decisions.
