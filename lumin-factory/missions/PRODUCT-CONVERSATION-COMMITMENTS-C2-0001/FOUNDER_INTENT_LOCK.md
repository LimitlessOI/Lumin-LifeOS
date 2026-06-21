<!-- SYNOPSIS: Founder Intent Lock -->

# Founder Intent Lock

**Mission:** PRODUCT-CONVERSATION-COMMITMENTS-C2-0001  
**Locked:** 2026-06-09 (founder review of Phase 0 salvage)  
**Authority:** BPB and builder must comply; overrides open questions in Phase 0 reports.

---

## Headline finding (Phase 0)

**~60–70% of the 7-day MVP already exists.** Conversation Commitments does **not** need to be built from scratch. Salvage + wiring + Evidence First + route consolidation is the path.

---

## Locked decisions

### 1. Daily surface — C2 is the destination

| Decision | Detail |
|----------|--------|
| Long-term home | **C2** (command center) |
| v1 implementation | Reuse **Mirror** and/or **Today**; embed or surface through C2 — **no new standalone dashboard** |
| Anti-pattern | Another commitment-only overlay disconnected from C2 |

### 2. Canonical table — evidence-based (not manual founder pick)

| Decision | Detail |
|----------|--------|
| **Canonical store** | **`commitments`** table via **`services/commitment-tracker.js`** |
| **Canonical API** | **`routes/lifeos-core-routes.js`** commitment endpoints |
| **Retire for v1 writes** | `lifeos_commitments` / `lifeos-commitment-tracker.js` as write path |
| **Blueprint task** | Fix split-brain: GET list currently hits duplicate mount → consolidate on core |

**Evidence summary:** event stream, extract, Mirror keep/snooze, and ecosystem services (integrity, scorecard, lumin) all use `commitments`. `lifeos_commitments` is a parallel simpler table with overlapping route prefix.

### 3. Privacy — private by default, always

| Decision | Detail |
|----------|--------|
| Default | **Private** for all users (Adam, Sherry, future customers) |
| Share | **Explicit opt-in** per commitment (or explicit batch action) |
| Field | `is_public` / share flags default **false** |

### 4. Evidence First Law

Every extracted commitment preserves: source conversation, source quote, timestamp, confidence, extraction method. User can always ask: **“Why does LifeOS think this commitment exists?”** See `FOUNDER_PACKET.md` § Evidence First Law (PSSOT master: `PSSOT.md`).

### 5. Blueprint scope — 7-day MVP only

BPB must **not** blueprint the 30-day feature set in the same pass.

**In blueprint:**

```text
Conversation → Extract → Approval → Commitment → Today/Overdue
```

**Out of blueprint (future packets):**

- Waiting On, Unconfirmed buckets (beyond staging)
- Calendar staging
- Sherry sharing
- Coaching, Programs Map, therapist mode

---

## Founder prediction (intent simulation)

A useful commitment system Adam uses in **~2 weeks** beats a 120-page architecture with no working product. **Ship the proof loop first.**

---

## Next step

BPB → `BLUEPRINT.json` for **7-day MVP slice only** → production builder.
