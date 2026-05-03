# Brainstorm sessions — multi-model protocol

**Purpose:** Run **structured**, **repeatable** brainstorms where **each model** contributes ideas, **ranking** happens explicitly, **synthesis** produces a second wave, and **triage** yields **build now / later / discard** — without confusing **IDE chat** with **recorded council** (see **`docs/CROSS_AGENT_CHANNEL.md`** and North Star **Article II §2.12**).

**Not law:** This doc is **operations**. Constitutional truth and load-bearing technical decisions still flow through **`AMENDMENT_01_AI_COUNCIL.md`**, gate-change, and **`POST /api/v1/lifeos/gate-change/run-preset`** or **`.../proposals/:id/run-council`** on the **running** app when §2.12 applies.

**Last updated:** 2026-05-08

---

## 0 — “Read the brainstorming file” (Adam trigger)

Whenever Adam invokes the **brainstorming section**, a **brainstorm session**, **25 ideas**, or **continue brainstorming** — agents **must** read **`docs/projects/OPERATOR_BRAINSTORM_SESSION_ENTRY.md` first**, then return here for **Phases 1–5**.

That entry file folds **ChatGPT-parity habits** (**branch charters** • **wide → narrow scoring** • **continuation without duplicate instructions**) plus **prior-idea fate audit before any new `N01–N25` block**.

Also see graded platform snapshot (**1–10**): **`docs/projects/LIFEOS_BROWSER_AND_PLATFORM_GRADE_2026-05-08.md`** (refresh date when re-grading prod).

---

## 1. Outputs (what “done” looks like)

Every session produces a **single session folder** (git-tracked or operator-chosen) under:

`docs/projects/BRAINSTORM_SESSIONS/<program-slug>/<YYYY-MM-DD>_<short-topic>/`

Minimum artifacts:

| File | Content |
|------|--------|
| **`00_CHARTER.md`** | Topic, program/amendment lane, trigger, success criteria, participants (model ids or “council preset id”), **operator decision on scope** (what is in / out). |
| **`10_IDEAS_PHASE1.md`** | For **each** participant: **exactly 25** ideas (numbered `A1…A25`, `B1…B25`, …). Short lines; no essays. |
| **`20_RANKINGS_PHASE2.md`** | Each participant’s **rank** of **all** Phase-1 lines they were given (e.g. top → bottom, or score 1–5 per idea id). Prefer **deterministic ids** (`A17`, `B04`) so merges do not scramble. |
| **`30_META_25_PHASE3.md`** | **Exactly 25** *new* ideas **inspired by** Phase-2 patterns (clusters, tensions, omissions) — **not** a copy-paste rerun of Phase-1. |
| **`40_RANK_META_PHASE4.md`** | Same participant set ranks the **Phase-3** list (again by stable ids `M01…M25`). |
| **`50_TRIAGE.md`** | Tables: **BUILD_NOW** · **NEXT** · **MARKET_ICEBOX** · **DISCARD** — each row cites idea ids + **one-line rationale** + **owner** (Conductor vs system `/build`). |
| **`60_SYNTHESIS_COUNCIL.md`** *(optional §2.12 slice)* | If triage selects a **load-bearing** fork (“which architecture”), attach **proposal id + run-council receipt** — not idle chat consensus. |

**Vault linkage:** Survivors worthy of backlog without full spec live in **`docs/projects/BUILDER_AUTONOMY_BRAINSTORM_VAULT.md`** (or a program-specific vault) with a back-link to **`50_TRIAGE.md`**.

---

## 2. phases (ordering is mandatory)

### Phase 1 — Idea rain (25 × N)

- **Each** model (or each council member in a **panel run**) emits **25** ideas.
- Ideas may target: **platform / TSOS**, **a shipped product**, or **something new** the author believes is **revolutionary** — label which in the line: `[SYS]`, `[PRODUCT:<name>]`, `[NEW]`.
- **No ranking** in Phase 1 — volume and diversity only.
- **Execution:** parallel **`POST /api/v1/lifeos/builder/task`** (plan mode) with a shared rubric, **or** manual IDE passes if keys/harness not ready — but **label the source** in `00_CHARTER.md` (KNOW vs THINK).

### Phase 2 — Each model ranks

- Each participant receives the **full union** of Phase-1 ideas (or a **stratified sample** if count explodes — then **document the sampling rule** in `00_CHARTER.md`).
- Each outputs a **total order** or **scorecard** per id.
- Goal: surface **agreement** (many top ranks) and **polarized** items (split votes) for Phase 3.

### Phase 3 — Meta-25

- **Exactly 25** *synthesized* ideas: gaps, combined concepts, “most controversial deserves a spike,” **anti-patterns to avoid**, etc.
- Must **reference** Phase-1/2 ids where relevant (`see A14+B02 tension`).

### Phase 4 — Rank meta-list

- Same ranking discipline as Phase 2 on `M01…M25`.

### Phase 5 — Collab triage (human + conductor + optional council)

**Portfolio scope:** Adam sets **which programs** run and **relative order**; **system + Conductor** propose **execution ordering** and **first‑N** slabs inside that scope (**see `docs/BUILDER_AUTONOMY_TRUST_AND_REVIEW_MODEL.md`** — operator vs system triage).

Participants (including Adam on vision-heavy calls) assign each **surviving** meta-idea to:

| Bucket | Meaning |
|--------|--------|
| **BUILD_NOW** | Fits current North Star lane, verifier path exists or is one GAP-FILL away, SSOT amended in same slice. |
| **NEXT** | Approved direction; queued behind CURRENT program or needs a thinner spec spike first. |
| **MARKET_ICEBOX** | Good but **explicitly deferred** — revenue, maturity, or dependency gate. |
| **DISCARD** | See **discard tests** below. |

**Discard tests (any one can disqualify)**

- Contradicts **`docs/SSOT_NORTH_STAR.md`** mission / sovereignty / honesty.
- Duplicate of shipped work **without** a new measurable lift (cite receipt).
- **THINK-only** hype with **no verification path** and **high irreversibility**.
- Ethics / compliance / dark-pattern shape (even if “could make money”).
- Superseded by a **later** idea in the same session with strictly **dominant** outcomes.

---

## 3. “Refine the gold, then implement”

1. **`BUILD_NOW`** rows → tightened **`task`/`spec`** (builder) or **`run-council`** if §2.12.
2. **`NEXT`** → enter **Approved Product Backlog** in the relevant **AMENDMENT** with a **receipt row** when slotted.
3. **`MARKET_ICEBOX`** → vault + **review date**.
4. **`DISCARD`** → one line in **session** + optional note in vault **“dead ends”** so nobody resurrects without new evidence.

---

## 4. How often & per program

### Per program (yes)

Run **separate** sessions when the **constituency** differs:

| Program / lane | Example slug | Notes |
|----------------|--------------|--------|
| LifeOS core | `lifeos` | Tied to **`AMENDMENT_21`** + consumer overlay SSOT. |
| Site builder / prospects | `site-builder` | **`AMENDMENT_05`** + revenue lane. |
| AI Council / TSOS platform | `tsos-platform` | **`AMENDMENT_01`** + builder/gate-change. |
| ClientCare / verticals | `clientcare` | When that program is active — do **not** dilute LifeOS brainstorm with unrelated regulatory context. |

Cross-program **meta** sessions (e.g. “TokenSaverOS thesis”) are **quarterly** or **ad-hoc** after major pivots.

### Cadence (recommended default)

| Stage | Full session (Phases 1–5 + artifacts) | Lightweight |
|-------|--------------------------------------|-------------|
| **Early build / high churn** | **Every 2–4 weeks** *or* at **named milestones** (alpha, first paid user, builder “green”) | Weekly: Conductor **§2.11b** + **compound loop** only — no 25×N burn. |
| **Maturing product** | **Quarterly** per active program | Monthly: triage **vault** + **backlog** reorder (no new meta-25 unless triggered). |
| **Steady state** | **Quarterly** (or **biannual** if churn is low) | **Always-on:** supervision, `/gaps`, receipts — **not** full brainstorm every week. |

**Why not “always full brainstorm”:** multi-model 25×rank×25×rank is **expensive** and **noisy** without harness discipline. The **always-on** layer is **supervision + builder + evaluation**; full brainstorm is **strategic refresh**.

**Trigger events** (run early even if calendar says wait):

- Major **North Star** or amendment change.
- **Repeated** same-class **`/builder/gaps`** after fixes (platform stuck).
- **Operator** sense of **strategic drift** (document in charter).

---

## 5. Technical execution (system paths)

Preferred order:

1. **`npm run builder:preflight`** (operator shell).
2. Structured generation: **`POST /api/v1/lifeos/builder/task`** with `files[]` including this protocol + program brief + `00_CHARTER.md` draft.
3. Load-bearing outcome: **`POST /api/v1/lifeos/gate-change/run-preset`** or **`lifeos:gate-change-run`** — see **`docs/QUICK_LAUNCH.md`**, **`AMENDMENT_01`**, **`config/gate-change-presets.js`** (extend presets only with receipts).

**Never:** treat a single IDE transcript as “the council ranked it” for **§2.12** decisions — **`docs/CROSS_AGENT_CHANNEL.md`**.

---

## 6. Relation to other docs

- **Builder autonomy idea pool:** `docs/projects/BUILDER_AUTONOMY_BRAINSTORM_VAULT.md`
- **Compound loop (routine improvement):** `docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`
- **Council / gate-change:** `docs/projects/AMENDMENT_01_AI_COUNCIL.md`, `docs/SSOT_COMPANION.md` §5.5
- **LifeOS handoff:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — **Agent Handoff Notes** link row

---

## 7. Session starter checklist (Conductor)

- [ ] Pick **program slug** + **amendment** owner.
- [ ] Write **`00_CHARTER.md`** (scope, out-of-scope, models list).
- [ ] Run Phase 1 → 2 → 3 → 4 with **stable ids**.
- [ ] Produce **`50_TRIAGE.md`** with **DISCARD** reasons where applicable.
- [ ] For **BUILD_NOW**, either open **builder** task or **gate-change** if §2.12.
- [ ] Append **Change Receipts** on touched amendments + **CONTINUITY** one-liner if cross-cutting.
