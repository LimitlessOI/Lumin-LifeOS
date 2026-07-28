<!-- SYNOPSIS: When-to-build plan — memory/governance continuity ideas (truth-updated 2026-07-27) -->

# Implementation plan — when to add each idea

**Status:** PLAN + status audit. No new implementation in this pass.  
**Bias:** Activation > redesign.  
**Critical correction (2026-07-27):** The Jul dump re-argued Phase 1 as if missing. Repo evidence shows **most Phase 1 slices already shipped (May 2026)**. Do not rebuild them. Move forward.

---

## Mandatory sequence (original consensus) — with LIVE status

```
Prevent collision          → ✅ C21 / O01 AUTONOMY_WRITE_LOCK (May 14; TTL hardened)
  → Activate memory + reader → ✅ C02 seed-lessons + digest + cold-start reader (May 14)
  → Require closure proof    → ✅ C09 closure-contract.mjs wired in queue (May)
  → Add lineage (Task DNA)   → ✅ S4 validate-task-dna.mjs (warn-only; partial population)
  → Learn prediction errors  → ✅ S5 prediction-loop.mjs + Jul Cognitive Core oracle/capture
  → Make readable to Adam    → ✅ founder:calm / founder-decoder.mjs exists
  → Then adaptive / long-horizon → PARTIAL / NEXT
```

**Evidence homes:** `docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md` (C21–S5 receipts); `docs/products/memory-intelligence/PRODUCT_HOME.md` (oracle/capture Jul); `scripts/lib/autonomy-write-lock.mjs`, `closure-contract.mjs`, `prediction-loop.mjs`, `founder-decoder.mjs`.

---

## Phase 0 — Preconditions (NOW)

| When | What | Why |
|------|------|-----|
| Immediate (no API) | Keep this vault current; stop re-inventing A/C/N lists | Continuity without token burn |
| Before heavy autonomy | Refill Anthropic + OpenAI; fix Gemini model id | Factory/Chair starved |
| Always | Product firewall: Credit ≠ Memory ≠ GRAIL lanes | Same chat mixed them |

---

## Phase 1 — DONE (do not re-build)

| Order | Slice | Idea ids | Status |
|-------|-------|----------|--------|
| 1 | Write lock | O01, C21 | ✅ LIVE |
| 2 | Memory bootstrap + reader | C02, C03-ish | ✅ LIVE (lessons + digest + cold-start) |
| 3 | Closure contract | C09 | ✅ LIVE |
| 4 | Task DNA v0 | N13, A06, C08 | ✅ Schema/validator LIVE; **population still PARTIAL** |
| 5 | Prediction↔outcome v0 | N06, C04/C05, A02/A03 | ✅ Builder prediction-loop + Cognitive Core oracle/capture |
| — | Founder Decoder | N12, A09 | ✅ `npm run founder:calm` |

**Next on DNA:** enforce or backfill DNA fields on more queue tasks (activation of existing validator), not a new DNA system.

---

## Phase 2 — Judgment (NEXT — ranked)

| Priority | Slice | Idea ids | Prerequisite / note |
|----------|-------|----------|---------------------|
| **P1** | Governance paralysis / friction score | A10, N16, C07 | Inputs exist in compliance; ratio not productized |
| **P2** | Task DNA population + hard gate option | N13, C08 | Validator warn-only today |
| **P3** | Hybrid / multi-signal retrieval | N02, industry | AM39 writes flowing; embeddings work exists — wire policy |
| **P4** | Confidence / freshness decay job | N03, C16, G10 | Fields exist; batch STALE tagging still thin |
| **P5** | Human value micro-feedback | N11, A11 | Tone adaption ≠ outcome feedback route |
| **P6** | Council decision ledger view | N15 | Join gate-change + debate_records |
| **P7** | Adaptive routing shadow (canary %) | N17, A13, C22 | Needs trace density (C11) |

---

## Phase 3 — Adaptive cognition (LATER)

| Slice | Idea ids | Note |
|-------|----------|------|
| Builder call consolidated trace index + SLOs | C11, N01, N24 | Lane JSONL exists; unified SLO thin |
| Failure-driven prompt patch (governed) | ACON-style | Council before prompt mutate |
| Spec richness pre-flight | C19 | Cuts bad council input |
| Token efficiency ratio | C24, A19 | Cost with eyes open |
| Anti-pattern catalog | C25 | Feeds from FPM level-3 |
| Memory write gate (reader-first) | C17 | Cultural lock against theater |

---

## Phase 4 — Long-horizon (ICEBOX until stable)

| Slice | Idea ids | Why wait |
|-------|----------|----------|
| Bounded causal chain simulator | A12 | Token + hallucination risk |
| Wisdom graph | A25 | Needs dense lessons |
| Decision replay at scale | A20 | Partial in Cognitive Core; full graph later |
| Constitutional sandbox sims | A22 | Expensive; gated |
| Full recursive consequence engine | GPT R01 | Document only |
| Canary build lane | C20 | After traces mature |
| MCP-wide refactor | industry | Portability later |
| Fully autonomous self-rewrite on main | — | **Never** without staged governed path |

---

## Memory location decision (locked)

| Layer | Store |
|-------|-------|
| Living facts / lessons / forecasts | **Neon (AM39 + Cognitive Core tables)** |
| Law / chronicles / receipts | **Git docs** |
| Ops traces | JSONL / tables; exportable |
| Chat | Never canonical |

---

## Self-rewriting answer (Adam’s question)

**Multi-AI consensus alone is not enough.**  
Safe pattern only: propose → adversarial AIs → council → tests → **staging** → monitor → rollback → promote.  
Write-lock already encodes the staging half.

---

## First build if Adam says “go” tomorrow

**Not C21** — already done.  

**Exactly one recommended next slice:**  
**Governance Paralysis / Friction Meter (C07 / N16 / A10)** — quantify safe-but-stuck from existing compliance signals; one score + plain-English alert.

**Runner-up:** Task DNA **population drive** (fill fields on active queues; optionally promote validator from warn → gate for new tasks only).

**Devil’s advocate:** Friction meter can become another advisory without action — pair with a single auto `pending_adam` when threshold trips, or it is theater.

---

## Principle still law-worthy (not yet NSSOT edit this pass)

> Every meaningful decision must become measurable wisdom.  
> Forecasts never checked are speculation.

Cognitive Core capture/oracle is the Jul 2026 embodiment — keep feeding it from real ships; don’t invent a second loop.

---

*End plan.*
