<!-- SYNOPSIS: BuilderOS Vocabulary — Canonical Definitions -->

# BuilderOS Vocabulary — Canonical Definitions

**Status:** LANGUAGE LAW — **SEALED v2.7 for build** (2026-06-09 founder consensus)  
**Sealed for build:** No terminology debate unless SNT finds active drift or build proves a term fails (receipt required). Not “done forever.”  
**Authority:** Supplements `docs/constitution/NORTH_STAR_SSOT.md`; does not override constitution  
**Amendment registry:** `docs/products/builderos/PRODUCT_HOME.md`  
**Governance architecture:** `docs/architecture/DELIBERATION_ARCHITECTURE.md`  
**Shareable report:** `docs/architecture/FOUNDER_VOCABULARY_CONSENSUS_REPORT.md` v2.7  

---

## Rule for every agent

1. **Use the definitions in this document** when writing SSOT, project SSOTs (LSSOT, etc.), blueprints, receipts, or handoffs.  
2. **Do not invent synonyms** for locked terms.  
3. **Do not elevate local jargon to law** without a receipted update to this file.  
4. If a term is **deprecated**, use the replacement; cite old term only when disambiguating legacy docs.  
5. **Strategic ambiguity** is a stop condition — resolve in the project SSOT before BPB, not in blueprint steps.  
6. **Results, not excuses.** Grades A–F come from evidence and outcomes. Law is earned by repeated passing results — and law remains reviewable.

When this file conflicts with an older doc, **this file wins for terminology** unless North Star explicitly defines the term differently.

### Completion / status claim words (separate SSOT)

This file does **not** define completion, readiness, or transport claim tokens (`TECHNICAL_PASS`, `BUILT_NOT_LIVE`, `FOUNDER_USABILITY_PASS`, `RELEASE_PASS`, `FULLY_MACHINE_READY`, etc.).

→ **`docs/COMPLETION_VOCABULARY_SSOT.md`** (`LOCKED` v1.0) — sole authority for those claim words.  
Do not invent synonyms; do not treat bare “done / live / ready / shipped” as claims.

---

## 0. Acronyms (machine channel)

Use these in receipts, JSON, CFO/TSOS logs, and handoffs. Spell out on first use in founder-facing prose.

| Acronym | Full term | Notes |
|---------|-----------|-------|
| **ChC** | **Council Chair** | Orchestrates; **not** the Council itself |
| **Cncl** | **Council** | Deliberation **process** — verdict on load-bearing items |
| **FM** | **Founder Mode** | Adam's privileged Lumin view |
| **BPB** | **Blueprint Builder** | Translator SSOT → living Blueprint — **no code** |
| **BP** | **Blueprint** | Living canonical build record |
| **CDR** | **Coder Department** | Execution authority — seventh dept |
| **SNT** | **SENTRY** | Optional short form in machine logs only |
| **Hist** | **Historian** | Ledger + mandatory case |
| **CFO** | **Resource stewardship** | Seventh-dept cluster: ROI, routing, scorecards |
| **TSOS** | **TokenSaverOS** | **Subsystem + doctrine under CFO** — not a department in v2.7 |
| **SDO** | **Studio** (Studio Design Office) | Visual / UX department |
| **REP** | **Representative capsule** | Domain context loaded into session — not a seat |
| **Obj** | **Objective** | Bounded build deliverable |
| **LSSOT** | **LifeOS SSOT** | LifeOS project working truth |
| **LimSSOT** | **LimitlessOS SSOT** | LimitlessOS project working truth |
| **MOSSOT** | **MarketingOS SSOT** | MarketingOS project working truth |

**Do not use:**

| Banned | Reason | Use instead |
|--------|--------|-------------|
| **C2** | Retired | **Founder Mode (FM)** |
| **AIC** | Retired | **Council (Cncl)** / **Council Chair (ChC)** |
| **CC** for Council Chair | Collides with Cloud Code | **ChC** |
| **Conductor** (dept) | Retired | **ChC loop** + **Supervisor session** |
| **PSSOT** | Redundant P | **LSSOT**, **LimSSOT**, `{Project}SSOT` |
| **Lens** | Retired v2.7 | **REP** |

**Legacy:** Old docs saying **TSOS department** → read as **CFO**. Old **Lens** → **REP**.

**Cursor interim:** **Supervisor session** = IDE agent running BuilderOS gates (§2.11b). Not a Lumin department.

---

## 1. System identity

| Term | Canonical meaning | Not this |
|------|-------------------|----------|
| **Lumin** | Governed system + **public face** — users talk to Lumin | Internal dept names |
| **BuilderOS** | **Autonomous build machine** — deliberation, builder, gates, proof chain | A department; not LifeOS |
| **Factory** | Internal label (`factory-staging/`). Engineer docs only | Founder-facing name |
| **LifeOS** | **Human OS** project | Not a department |
| **LimitlessOS** | **Business OS** project | Not merged with LifeOS |
| **MarketingOS** | Marketing / social project | Not BuilderOS |
| **CFO** | **Department** — resource stewardship | Not “finance only” — includes AI spend, routing, ROI |
| **TSOS** | Compression/saver **engine + doctrine** inside CFO | Not interchangeable with BuilderOS or CFO dept |
| **Shared infrastructure** | Identity, memory, scheduling — one architecture, many products | Silos |
| **Production spine** | Railway: `routes/`, `services/`, `public/overlay/` | Factory authority without receipt |

---

## 2. Truth spine (Evidence → Confidence → Truth → Law)

| Stage | Meaning |
|-------|---------|
| **Evidence** | Raw receipts — conversations (archive), CI, verifiers, outcomes, debates |
| **Confidence** | Weighted belief — KNOW/THINK/GUESS |
| **Truth** | Operational fact — scoped, retrieval-governed |
| **Law** | Governance — ratified by process, reviewable |

**Memory** preserves evidence. **Archive ≠ authority.** See `docs/architecture/TRUTH_SYSTEM_ARCHITECTURE.md`.

**Two ladders — never merge:** Evidence (AM39) vs Governance (NSSOT §2.0B).

---

## 3. Governance stack

```text
Constitution (North Star + Companion)
        ↓
Amendment (project law)
        ↓
{Project}SSOT (e.g. LSSOT)
        ↓
Blueprint (living canonical model)
        ↓
Shipped code + Change Receipts
```

---

## 4. Work hierarchy

| Term | Meaning |
|------|---------|
| **Vision / Life mission** | Human purpose — not a factory folder |
| **Project** | LifeOS, LimitlessOS, MarketingOS, … |
| **Objective (Obj)** | One bounded shippable slice |
| **Phase** | Deliberation, blueprint, build, verify |
| **Step** | Atomic BP action (`write_file_exact`, …) |

**Deprecated:** factory **Mission** → **Objective**. No **C2** in new IDs.

---

## 5. Blueprint

> Living, exact, machine-readable model of what the system is and how it must be built.

**BPB** translates SSOT → Blueprint. **BPB does not think. BPB does not code.**  
**CDR / Coder tier** executes frozen steps. **No design inference.**

---

## 6. Seven departments — separation of powers

**Hard cap: seven.** Amend only via founder + Cncl receipt.

**Constitutional rule:** **No department decides load-bearing outcomes alone.** Every dept submits a full case; **Cncl** verdicts; **Adam** human gates.

| Dept | Role | Mandatory contribution |
|------|------|------------------------|
| **ChC** | Founder communication; assembles roster; orchestrates; **routine judgment**; Founder Debrief | Orchestration case — **no load-bearing verdict alone** |
| **Hist** | Nail-level ledger; lessons; triggers | **Case** — evidence, meaning, ideas, opportunity — **does not verdict** |
| **SNT** | Immune system; drift; law challenge | Attack + **proposed solutions** |
| **CFO** | ROI, routing, model scorecards, composition scorecard; TSOS subsystem | Stewardship case — speed + spend + results (not thrift-at-all-costs) |
| **BPB** | SSOT → living Blueprint | Translation case — **no code** |
| **CDR** | Code execution authority | Execution receipts; blockers upward — **no design** |
| **SDO** | Visual / UX when UI in scope | UX case — specs, not product law |

### CDR vs Coder vs BuilderOS

| Term | Layer |
|------|-------|
| **CDR** | Department (7th seat) |
| **Coder** | Model **tier** under CDR — cheap, deterministic, zero-decision |
| **BuilderOS** | Platform/product |

### CFO vs TSOS

| Layer | Name |
|-------|------|
| Department | **CFO** |
| Subsystem | **TSOS** (token saver / compression) |
| Doctrine | **TSOS doctrine** |

**Founder priority mode:** Adam declares outcome/speed wins → CFO records all spend; **does not block** on thrift.

### Not departments

- **Cncl** — process; **load-bearing verdict**  
- **Products** — LifeOS, LimitlessOS, MarketingOS, BuilderOS, …  
- **REPs** — domain context capsules (see §6a)  
- **Triggers** — `scheduleTrigger` platform function  

### Session law — BPB ↔ CDR

When **both** blueprint translation and code execution occur in the **same window** → **two AIs minimum** (one BPB focus, one CDR focus). Same AI cannot lawfully wear both in one session.

Blockers: **CDR → BPB → ChC → Adam**.

---

## 6a. REPs (Representative capsules)

A **REP** is context — **not** a seat, department, AI, or vote.

**LifeOS REP** example contents: LSSOT slice, BP refs, history, priorities, constraints, lessons.

**Catalog (expand with AM48 receipt):** LifeOS · LimitlessOS · Marketing · Relationship · Health · Founder · Customer · Revenue · Scalability · Privacy · Education

Multiple REPs may stack on one model. Prefer adding REPs over adding AIs when only context is needed.

### Authority vs REP capsules (separate — do not merge)

| Stack | Contents |
|-------|----------|
| **Authority** | Dept law — SNT rules, CDR contract, BPB translate-only, CFO rubrics |
| **REP** | Domain state — SSOT, BP, lessons |

Load order: **authorities → REPs → session evidence**.

---

## 6b. Council execution

**ChC selects per session:** `authorities[]`, `reps[]`, `models[]` + `focus` per model, `partial|full`.

**Lean default:** smallest roster that can pass. **Expand or block signoff** when audit shows gap from absent authority/REP. Hist records `roster_used`, `audit_expanded_roster`, `reason`.

**Models:** replaceable by scorecard. **Roles:** permanent.

---

## 7. Project Development + Blueprint Deliberation

### Project Development

Founder + ChC + Cncl (+ REPs) → verdicts → LSSOT / LimSSOT / MOSSOT.

### Blueprint Deliberation Loop

```text
ChC convenes Cncl (lean or full — CFO/Hist scorecard)
  authorities[], reps[], models[]
        ↓
BPB drafts/updates BP (BPB AI — if on roster)
        ↓
SNT attacks + proposes fixes
        ↓
REPEAT → READY_FOR_DETERMINISM_TEST
        ↓
Determinism test (3 Coder-tier — equivalence + per-model score)
        ↓
CDR executes (CDR AI — separate from BPB session if same window)
        ↓
SNT verify → Hist + CFO receipts → BP update
        ↓
Founder Debrief if Adam offline
```

Load-bearing consensus: full protocol in `DELIBERATION_ARCHITECTURE.md` §9 (brainstorm, 1/2/4/5y future-back, competitive scan, synthesis E/K).

---

## 8. Product surface

| Term | Meaning |
|------|---------|
| **Lumin** | User-facing — users never see dept names |
| **FM** | Adam privileged view — not a department |
| **Overlay / program shell** | Window into Lumin per device/project |

---

## 9. Feedback & demand signals

Demand signals → BuilderOS registry → **Cncl** prioritization.

---

## 10. Project SSOT naming

| Project | Acronym |
|---------|---------|
| LifeOS | **LSSOT** |
| LimitlessOS | **LimSSOT** |
| MarketingOS | **MOSSOT** |

Deliberation gate: ChC sign-off before BPB intake. UI objectives need **SDO** specs.

---

## 11. Determinism test

Three **Coder-tier** models; equivalence + per-model coding score. CFO + Hist persist scorecard.

---

## 12. Law review

SNT challenges · Cncl verdicts · Hist schedules. Vocabulary drift scan vs this file.

---

## 13. Triggers

`scheduleTrigger` — not a department. Hist + CFO self-schedule; ChC urgent override.

### Hist MUST record + contribute case

Every nail: sessions, rosters, REPs, models, costs, positions, synthesis, predictions, outcomes, lessons, debrief artifacts.

### CFO MUST receipt

Every AI call: dept, role, model, tokens, cost, routing changes, composition scorecard updates.

**CFO immediate fix:** cheaper path or routing waste → fix now or flag ChC; monitor with Hist at 7d/30d.

---

## 14. Founder Debrief

Template: `docs/architecture/FOUNDER_DEBRIEF_TEMPLATE.md`  
Hist produces · ChC delivers · **Layer 1 synopsis** plain English always.

---

## 15. Deprecated terms

| Deprecated | Replacement |
|------------|-------------|
| **C2** | **FM** |
| **AIC** | **Cncl** / **ChC** |
| **Conductor** (dept) | **ChC** + Supervisor session |
| **PSSOT** | **LSSOT** / **LimSSOT** |
| **Mission** (factory) | **Objective** |
| **Lens** | **REP** |
| **TSOS** as department | **CFO** (TSOS = subsystem) |
| **Coder** as department name | **CDR** (Coder = model tier) |
| Hist = records only | Hist = records + **mandatory case** |

---

## 16. How to change this vocabulary

1. Edit this file + AM48 receipt.  
2. Article VII if constitutional.  
3. SNT drift scan on deprecated terms.

---

## Quick reference card

```text
Lumin     = public face
FM        = Founder Mode
Seven     = ChC · Hist · SNT · CFO · BPB · SDO · CDR
Coder     = model tier under CDR (not a dept name)
TSOS      = subsystem under CFO
REP       = domain context capsule
Cncl      = verdict (load-bearing)
Products  = LifeOS · LimitlessOS · MarketingOS · BuilderOS · …
Evidence → Confidence → Truth → Law
Sealed for build · Results = A–F
```
