# Deliberation & Governance Architecture

**Status:** Ratified — **v2.7 seal** (2026-06-09 founder consensus)  
**Authority:** Supplements `docs/BUILDEROS_VOCABULARY.md`, `docs/SSOT_NORTH_STAR.md` §2.12, `docs/SSOT_COMPANION.md` §5  
**Shareable summary:** `docs/architecture/FOUNDER_VOCABULARY_CONSENSUS_REPORT.md` (v2.7)

---

## 1. Constitutional spine — separation of powers

**No department decides load-bearing outcomes alone.**

Every department:

1. **Thinks fully** — as if it owned the decision  
2. **Submits a case** — problem, evidence, solutions, context, uncertainty labels  
3. **Never closes alone** on load-bearing items  

| Actor | Role |
|-------|------|
| **Cncl** | **Verdict** on load-bearing decisions (consensus) |
| **ChC** | Orchestrates; **routine judgment** only; delivers Founder Debrief |
| **Adam** | Human Guardian — locks, overrides, founder priority mode |
| **Hist** | Ledger + **must contribute case** (does not verdict) |
| **SNT** | Adversarial + **must propose solutions** (does not verdict) |
| **CFO** | Stewardship case — spend, speed, ROI (does not verdict) |
| **BPB / CDR / SDO** | Translate / execute / specify — **separated powers** |

**BPB ↔ CDR** is the clearest separation: one translates the plan; a **different** executor codes it. Same session with both phases → **two AIs minimum** (session law).

---

## 2. Three organizational layers (do not conflate)

| Layer | Question | Stable? | Example |
|-------|----------|---------|---------|
| **Department** | What *kind* of work? | Yes — seven seats | SNT adversarial review |
| **Product / Project** | Where does it apply? | Yes — growing list | LifeOS, LimitlessOS |
| **REP** | What *context* is loaded? | Invited per session | LifeOS REP, Relationship REP |

LifeOS is **not** a department. It is a **product** and a **REP capsule**.

---

## 3. Three execution layers (session mechanics)

| Layer | What it is | Example |
|-------|------------|---------|
| **Authority capsule** | Dept law — rules, obligations, escalation | SNT authority, CDR authority |
| **REP capsule** | Domain context — SSOT, BP slice, lessons, priorities | LifeOS REP |
| **Model** | Replaceable thinker/executor | GPT, Claude, Gemini — scorecard-selected |

**Load order:** authorities → REPs → session evidence.

```text
CnclRoster {
  authorities: [SNT, CFO],
  reps: [LifeOS, Founder, Relationship],
  models: [
    { id: "...", focus: ChC, authorities: [ChC], reps: [...] },
    { id: "...", focus: SNT, authorities: [SNT], reps: [...] }
  ],
  partial: true,
  roster_used: [...],
  audit_expanded_roster: null | [...],
  expand_reason: null | string
}
```

**Multi-hat capability:** models may load multiple authorities + REPs; **`focus`** = primary hat this turn.  
**Production default:** specialized models per role (ChC model, SNT model, Coder-tier for CDR).  
**Session law:** **BPB and CDR cannot be the same AI in the same session** when both translate and execute are in scope.

---

## 4. Seven departments (hard cap — amend only via founder + Cncl)

| Dept | Acronym | Contributes (mandatory case) | Executes? | Verdict alone? |
|------|---------|------------------------------|-----------|----------------|
| Council Chair | **ChC** | Orchestration, synthesis, founder bridge | No | No (load-bearing) |
| Historian | **Hist** | Ledger, meaning, ideas, opportunity, lessons | No | No |
| SENTRY | **SNT** | Attack + **solutions** + future-back + competitive scan | No | No |
| Resource stewardship | **CFO** | ROI, speed, spend, routing, composition scorecard | Routing fixes only | No |
| Blueprint Builder | **BPB** | Translation case — SSOT → BP | Translates — **no code** | No |
| Coder Department | **CDR** | Execution receipts, blockers upward | Codes frozen steps — **no design** | No |
| Studio | **SDO** | Visual / UX case | Specs only | No |

### CFO vs TSOS (layer clarity — not suffixes)

| Layer | Name | Role |
|-------|------|------|
| **Department** | **CFO** | Resource stewardship — budget, ROI, model scorecards, routing, composition scorecard |
| **Subsystem** | **TSOS** | Token saver / compression / signal-density engine **inside** CFO |
| **Doctrine** | **TSOS doctrine** | Philosophy of reducing communication cost while preserving signal |

Legacy code/logs may still say `TSOS` for dept — read as **CFO** in new docs; rename on touch with receipt.

### CDR vs Coder

| Term | Layer |
|------|-------|
| **CDR** | Seventh **department** — execution authority |
| **Coder** | **Model tier** under CDR — cheap, deterministic, follows frozen steps |

---

## 5. REP capsules (replaces “Lens”)

A **REP** is **not** a seat, department, AI, or vote. It is a **context capsule** loaded into deliberation.

**LifeOS REP** may contain: LSSOT slice, blueprint refs, history, priorities, constraints, lessons, laws.

**Catalog (expand with one-line AM48 receipt):**

LifeOS · LimitlessOS · Marketing · Relationship · Health · Founder · Customer · Revenue · Scalability · Privacy · Education

Multiple REPs stack cheaply on one model. Adding REPs is preferred over adding AIs when only context is needed.

**Deprecated term:** **Lens** → **REP** in all new docs.

---

## 6. Judgment chain

```text
Adam (human gates, founder priority mode)
  ↑
ChC (orchestrates, routine judgment, Founder Debrief)
  ↑
Cncl (load-bearing verdict — consensus protocol)
  ↑ fed by mandatory cases from
Hist · SNT · CFO · BPB · SDO · (CDR on execution receipts)
```

### Hist suggestion routing

| Suggestion type | Routes to |
|-----------------|-----------|
| Cost, speed, delay ROI | **CFO** |
| Safety, drift, law | **SNT** |
| Load-bearing org/architecture | **ChC → Cncl** |
| Blueprint / build | **BPB / CDR** (after Cncl) |
| Human lock / budget / priority | **Founder Debrief → Adam** |

Empty Hist case on load-bearing session = **process failure**.

---

## 7. Council Chair assembly

**ChC does NOT decide load-bearing outcomes.**

**ChC decides:** authorities[], reps[], models[], partial|full, escalate founder, emergency trigger pull-forward.

Then **consensus protocol** runs.

---

## 8. Partial Cncl — lean default, expand on failure

**Default:** smallest roster that can pass for this decision type (money matters).

**Expand or block signoff when:** SNT audit, Position synthesis, or post-outcome variance shows gap tied to **absent authority or REP**.

Hist records: `roster_used`, `audit_expanded_roster`, `reason`, `cost_delta`.

CFO + Hist maintain **composition scorecard**: roster × decision_type × outcome × cost × grade (A–F).

### Session patterns

| Session type | Typical roster |
|--------------|----------------|
| Deliberation only | 1–2 AIs — e.g. ChC + SNT; no CDR |
| Blueprint | BPB + SNT (+ Hist case) |
| Build (BP frozen) | CDR only — 1 Coder-tier AI |
| Translate + execute same window | **BPB AI + CDR AI** (two AIs — session law) |
| Off-hours / day-to-day lean | Cheap models; **still scored and logged** |

---

## 9. Consensus protocol (load-bearing)

**Constitutional:** NSSOT §2.12 · **Operational:** Companion §5.2–§5.5 · **HTTP:** `POST /api/v1/lifeos/gate-change/run-preset`

### Standard steps

1. Problem framing  
2. Pro/con — steel-man both sides  
3. **Brainstorm** (when stakes warrant) — per `OPERATOR_BRAINSTORM_SESSION_ENTRY.md` + `BRAINSTORM_SESSIONS_PROTOCOL.md` — may surface option **K**, not only A/B  
4. Blind spot scan  
5. **Multi-horizon future-back** — **1y · 2y · 4y · 5y** — what worked, broke, wish we’d known  
6. **Competitive / external scan** — what others do, improve or integrate if superior  
7. **Synthesis** — Position E/K — reframe beyond A vs B  
8. Vote + confidence  
9. Audits (SNT where required)  
10. Log + rollback + future-back artifact  
11. Predicted outcome → Hist  
12. **Founder Debrief** queued if Adam offline  

**Instant consensus is valid only after steps 1–7 ran.** Skipping pushback = §2.12 bypass.

### Position synthesis fields (structured)

```text
original_positions: []
brainstorm_ids: []   // N01–N25 when run
final_synthesis: string
position_e_or_k_found: boolean
participants: []
```

---

## 10. CFO stewardship doctrine

**Good steward ≠ cheapest at all costs.**

- **Slow has a price** — delay is an ROI line item  
- Spend when ROI justifies **and** funds exist  
- Optimize for **faster, robust, better results** with evidence  
- **Founder priority mode:** Adam declares speed/outcome wins → CFO **records all spend**, **does not block** on thrift  

Stewardship capability is a **future product surface** (operator-facing; TSOS engine inside).

---

## 11. Scoring & measurement

**Hist:** nail-level ledger — every call, token, step, debate turn, roster, REP, grade, prediction.  
**CFO:** efficiency scores, composition ROI, context budget caps.  
**SNT:** adversarial quality rubric.  
**Ground truth:** Hist outcome vs prediction → retrograde A–F.

Same model **battery** (4–5 runs per role) measures variance — scheduled or on model upgrade. Production: log everything from day one with default models.

---

## 12. Founder Debrief

**Template:** `docs/architecture/FOUNDER_DEBRIEF_TEMPLATE.md`

Hist produces facts; ChC delivers. **Layer 1 synopsis** always (plain English). Layer 2 optional depth. Delivery format flexible (written default; SDO may render briefings later — not constitutional).

Adam may skip reading — his choice — but synopsis **must exist**.

---

## 13. Vocabulary status

**Sealed for build** — not “done forever.” Change only when SNT finds active drift or build proves a term fails (receipt required).

---

## 14. Build pipeline

```text
PROJECT DEVELOPMENT (founder + ChC + Cncl + REPs)
  → consensus → LSSOT / LimSSOT / MOSSOT
BLUEPRINT DELIBERATION (BPB + SNT loop + Hist case)
  → READY_FOR_DETERMINISM_TEST
DETERMINISM TEST (3 Coder-tier — equivalence + per-model score)
CDR EXECUTION (frozen steps only)
SNT VERIFY → Hist + CFO receipts → BP update
Founder Debrief if Adam was offline
```

Org may propose split/merge when results show redundancy — load-bearing org changes use **full protocol** + rollback path.

---

## 15. Implementation backlog (next build slice)

| Priority | Hook | Status |
|----------|------|--------|
| P0 | `CnclRoster` JSON schema + `POST /api/v1/lifeos/deliberation/roster` | **Shipped** 2026-06-09 |
| P0 | Composition scorecard table + API | **Shipped** 2026-06-09 |
| P1 | Position E/K in gate-change council run + prompt | **Shipped** 2026-06-09 |
| P1 | Hist case + CFO receipts + gate API | **Shipped** 2026-06-09 |
| P1 | Factory BPB intake deliberation gate (jsonl) | **Shipped** 2026-06-09 |
| P1 | Gate-change auto-persist to deliberation tables | **Shipped** 2026-06-09 |
| P2 | Neon migration apply on Railway boot | **Shipped** — `20260609_deliberation_governance_v27.sql` + `20260609b_founder_debrief_rep_catalog.sql` |
| P2 | Founder Debrief auto-generation | **Shipped** — `founder-debrief-service.js` + `GET /debrief/:sessionId` + post-`/build` finalize |
| P2 | Builder `/build` deliberation pipeline | **Shipped** — `builder-deliberation-hook.js` |
| P2 | A→Z smoke script | **Shipped** — `scripts/deliberation-a-to-z-smoke.mjs` |
| P2 | REP catalog boot sync | **Shipped** — `bootDeliberationRepCatalog` |
| P3 | REP catalog registry UI | Not built |
| P3 | Founder Debrief delivery to FM/Lumin UI | Not built |

---

## 16. Cross-references

- `docs/BUILDEROS_VOCABULARY.md` v2.7  
- `docs/architecture/MEMORY_ARCHITECTURE_ARCHAEOLOGY.md`  
- `docs/architecture/TRUTH_SYSTEM_ARCHITECTURE.md`  
- `docs/architecture/FOUNDER_VOCABULARY_CONSENSUS_REPORT.md`  
- `docs/architecture/factory-v1-blueprint-pack/CODER_ZERO_DECISION_BUILD_SPEC_V1.md`  
- `docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md`
