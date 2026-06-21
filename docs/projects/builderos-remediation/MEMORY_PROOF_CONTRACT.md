<!-- SYNOPSIS: BuilderOS Memory Proof Contract -->

# BuilderOS Memory Proof Contract

**Closes:** BR-04 (Memory Authority Fragmentation) from `BLUEPRINT.md`  
**Status:** RATIFIED  
**Created:** 2026-05-27

---

## 1. Purpose

This contract closes BR-04 from the remediation queue. BuilderOS currently scores memory maturity from `self_repair_memory_events` — a repair log table written by the self-repair executor. This table proves the repair loop ran. It does not prove that the governed memory architecture (Amendment 39, epistemic facts) is operational. Without this contract, a high memory maturity score can coexist with zero governed facts in the canonical store.

---

## 2. Canonical Proof Source

The single canonical proof source for BuilderOS memory maturity scoring is the **Amendment 39 epistemic facts system**.

**Table:** `epistemic_facts`  
**Canonical endpoint:** `GET /api/v1/lifeos/command-center/memory/status` (must expose epistemic_facts counts and levels, not self_repair_memory_events counts)  

**Minimum condition for each maturity level:**

| Level | Condition |
|-------|-----------|
| WIRED | `epistemic_facts` table exists in DB schema (structural only — no data required) |
| LIVE | Table queryable AND `COUNT(*) >= 1` |
| PROVEN | At least one fact with `level >= 2` (TESTED) AND `source_count > 1` |
| ACTIVE | PROVEN conditions met AND `COUNT(DISTINCT domain) >= 5` |

---

## 3. Non-Canonical Sources

The following sources do NOT count as canonical BuilderOS memory proof and MUST NOT elevate memory maturity above WIRED:

| Source | Why non-canonical |
|--------|------------------|
| `self_repair_memory_events` | Proves repair loop ran — not governed memory architecture. Operational log, not evidence store. |
| JSONL files on local disk (`data/*.jsonl`) | Ephemeral, not Railway-durable. Evaporates on redeploy. Not queryable at runtime. |
| Amendment 02 legacy memory tables (`conversation_memory`, `memory_capsules` pre-v39) | User/product memory, not BuilderOS operational memory. Different architecture, different purpose. |
| In-memory session objects | No persistence, not a proof surface. |

If `self_repair_memory_events` row count is > 0 but `epistemic_facts` has 0 qualifying rows: memory maturity is **LIVE** (0.5) at most.

---

## 4. Scoring Rule

The alpha readiness service (`services/builderos-system-alpha-readiness.js`) MUST apply this rule:

```
memoryProvenCount = COUNT(*) FROM epistemic_facts WHERE level >= 2 AND source_count > 1
```

| Condition | Maturity | Score |
|-----------|----------|-------|
| epistemic_facts table missing or query fails | WIRED | 0.25 |
| Table exists, COUNT(*) = 0 | WIRED | 0.25 |
| COUNT(*) >= 1, no PROVEN rows | LIVE | 0.5 |
| memoryProvenCount >= 1 | PROVEN | 0.75 |
| PROVEN + COUNT(DISTINCT domain) >= 5 | ACTIVE | 1.0 |

The current repair (using self_repair_memory_events) may remain as a **supplementary diagnostic field** in the response body — but it MUST NOT influence the memory maturity score or status array.

---

## 5. Pass/Fail Checks

- **CHECK-M1:** `GET /api/v1/lifeos/command-center/system-alpha-readiness` — `memory.statuses` does NOT include PROVEN when `epistemic_facts` has 0 rows with `level >= 2`
- **CHECK-M2:** `self_repair_memory_events` row count alone cannot elevate memory to PROVEN. System with 1000 repair events but 0 epistemic facts must show memory = LIVE or WIRED.
- **CHECK-M3:** `memory.proof_source` in alpha readiness response cites `epistemic_facts` endpoint or table, not `self_repair_memory_events`
- **CHECK-M4:** `ALPHA_READY` is blocked while memory is LIVE-only from repair log (MEMORY_NOT_RUNTIME_PROVEN blocker remains active)

---

## 6. Required Code Change (BR-07)

In `services/builderos-system-alpha-readiness.js`, Phase B memory block (around line 121–131):

**Replace:** query to `self_repair_memory_events` (COUNT + latest row)

**With:**
```
SELECT COUNT(*) FROM epistemic_facts WHERE level >= 2 AND source_count > 1
```

If `epistemic_facts` table does not exist (query throws) → memory stays at WIRED (0.25).  
If query returns 0 → memory is LIVE if table is queryable with any rows, else WIRED.  
If query returns >= 1 → memory is PROVEN.  

The `self_repair_memory_events` query may remain as a separate diagnostic field (e.g., `repairMemoryDb`) for the supplementary `proof_source` string, but it MUST NOT set the `statuses` array.

---

## 7. Transition Note

Until `epistemic_facts` is seeded with real Level-2+ facts, memory will score WIRED or LIVE. That is honest. Do not re-introduce the repair log shortcut to artificially elevate the score.

The path to PROVEN is: seed at least one fact at level >= 2 with source_count > 1 via the Amendment 39 governed write path.
