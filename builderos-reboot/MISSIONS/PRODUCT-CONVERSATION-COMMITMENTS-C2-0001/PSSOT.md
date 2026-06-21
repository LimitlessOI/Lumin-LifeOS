<!-- SYNOPSIS: PSSOT — Project Single Source of Truth -->

# PSSOT — Project Single Source of Truth

> **⚠️ NOT founder authority.** Outcome truth → **`FOUNDER_PACKET.md`**. This file is **product truth** (system-maintained). Pre-2026-06-11 content archived in `_hist/PSSOT_2026-06-09.md`.

**Mission:** `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001`  
**Project:** LifeOS  
**Status:** System derives from founder packet → blueprint → execute  
**Last updated:** 2026-06-11  

> **Terminology:** `docs/BUILDEROS_VOCABULARY.md` (language law).  
> **BPB reads founder packet + PSSOT and produces `BLUEPRINT.json`.** PSSOT is not a blueprint.

---

## What PSSOT is (and is not)

| Layer | Example | Role |
|-------|---------|------|
| **Constitution** | `SSOT_NORTH_STAR.md`, `SSOT_COMPANION.md` | System law — wins all conflicts |
| **Amendment** | `AMENDMENT_21_LIFEOS_CORE.md` | Long-lived **project domain** law — receipts, `@ssot` on shipped code |
| **PSSOT** | **This file** | **Mission working truth** — brainstorm + dump + decisions **before** build |
| **Blueprint** | `BLUEPRINT.json` | Step-atomic build queue (BPB output) |

**PSSOT** = where you think out loud for one mission inside a project (LifeOS, MarketingOS, …).  
When the mission ships, receipts flow into the relevant **amendment**. Until then, **PSSOT wins** for that mission.

---

## Proof question (one sentence)

**Can LifeOS reliably turn real conversations into useful action?**

Paste or approve a conversation → extract commitments with evidence → you approve → Today/Overdue → every row answers *"Why does LifeOS think this exists?"*

---

## Headline finding (archaeology)

**~60–70% of the 7-day MVP already exists** in the production repo.

Not greenfield. Wire + Evidence First + fix split-brain + ship proof loop.

---

## Locked decisions

| # | Decision |
|---|----------|
| 1 | **C2** long-term home; v1 = Mirror/Today + documented C2 embed path — no new dashboard |
| 2 | **`commitments`** table + `commitment-tracker.js` (salvage evidence) |
| 3 | **Private by default** — everyone; explicit share only |
| 4 | **Evidence First Law** — source quote, timestamp, confidence, method; UI: *"Why does LifeOS think this exists?"* |
| 5 | **Blueprint scope:** 7-day MVP only in one BP pass |

---

## 7-day MVP (blueprint target)

```text
Conversation (paste) → Extract (evidence) → You approve → commitments table → Today/Overdue
```

**Out of this blueprint:** waiting-on, calendar, Sherry share, coaching, Programs Map, Word Keeper, CC rebuild.

---

## 30-day horizon (future PSSOT / mission — not this BP)

Waiting-on · unconfirmed buckets · calendar staging · Sherry opt-in · C2 panel

---

## Salvage summary

| Asset | Verdict |
|-------|---------|
| `lifeos-event-stream.js`, `/events/capture` | ADAPT — primary ingest |
| `commitment-tracker.js`, `lifeos-core-routes.js` | CANONICAL |
| `lifeos-mirror.html`, `lifeos-today.html` | ADAPT — v1 UI |
| `lifeos_commitments` + duplicate routes | REJECT for v1 — split-brain |
| Command Center HTML | REFERENCE — not v1 home |
| Word Keeper / coaching | OUT OF SCOPE |

**Must fix in blueprint:** GET list vs keep/event-stream hit different tables.

Detail: `LIFEOS_SALVAGE_ASSESSMENT.md`, `SALVAGE_REVIEW.json`

---

## Evidence First Law

LifeOS may suggest and infer. **It may never rewrite history.**

Every extraction preserves: source conversation · source quote · timestamp · confidence · extraction method.

---

## PSSOT → Blueprint conversion (for BPB)

| PSSOT section | Becomes in `BLUEPRINT.json` |
|---------------|----------------------------|
| 7-day MVP flow | Phase sequence (P0–P5) |
| Salvage table | `target_file` per step + `non_goals` |
| Locked decisions | Step contracts + `authority_owner` |
| Out of scope list | Global + per-step `non_goals` |
| Acceptance intent | `ACCEPTANCE_TESTS.json` IDs on each step |
| Split-brain fix | Dedicated consolidation step(s) |

Full BPB instructions: `BPB_HANDOFF_SPEC.md` · Conversion rules: `PSSOT_TO_BLUEPRINT.md`

---

## Mission folder (PSSOT ecosystem)

| Role | File |
|------|------|
| **PSSOT (this doc)** | `PSSOT.md` |
| Brainstorm / intent lock | `FOUNDER_INTENT_LOCK.md` |
| BPB handoff | `BPB_HANDOFF_SPEC.md` |
| Archaeology | `LIFEOS_SALVAGE_ASSESSMENT.md` |
| Utility analysis | `PERSONAL_UTILITY_ANALYSIS.md` |
| Tests catalog | `ACCEPTANCE_TESTS.json` |
| Machine salvage | `SALVAGE_REVIEW.json` |
| Technical depth | `FOUNDER_PACKET.md` *(appendix)* |
| Machine intake | `FOUNDER_PACKET.json` *(factory legacy name; sync from PSSOT)* |

---

## Pipeline

```text
✅  PSSOT + archaeology (AIC)
✅  BPB handoff spec
⏳  BPB → BLUEPRINT.json
⏳  Billing gate (debit card)
⬜  Execute
⬜  Daily use → amendment receipts
```

---

## Gates

| Gate | Status |
|------|--------|
| AIC / salvage | Done |
| BPB blueprint | Ready (no tokens) |
| Execute | Blocked — billing |
| Amendment update | After shipped proof |

---

## Non-goals

All of LifeOS · therapy/mediation AI · surveillance · autonomous send · C2 as brain · silent legacy reuse

---

## Dump zone (add brainstorm below)

*Use this section for new ideas, open questions, and raw notes. AIC/BPB triage into locked decisions or deferred missions.*

- *(empty — add here)*

---

## PSSOT sign-off

| Field | Value |
|-------|-------|
| Mission | PRODUCT-CONVERSATION-COMMITMENTS-C2-0001 |
| Project | LifeOS |
| Version | 1 |
| BPB authorized | Yes — 7-day slice only |
| Execute authorized | No — pending billing |

*If anything conflicts with agent memory, this PSSOT wins for this mission until you update it.*
