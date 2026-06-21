<!-- SYNOPSIS: Phase 2 — Cross-council ranking (source-preserving) -->

# Phase 2 — Cross-council ranking (source-preserving)

**Session:** `2026-05-13_capsule-ssot-convergence`  
**Program:** `tsos-platform`  
**Prerequisites:** `00_CHARTER.md`, `10_IDEAS_OPERATOR_PHASE1.md`, `01_CONVERGENCE_CHRONICLE.md`  
**Not law:** Operational brainstorm artifact. Load-bearing technical decisions → **`AMENDMENT_01`** + **`run-council` / gate-change`** on the **running** app (**North Star Article II §2.12**).

---

## CAI — PHASE 2 CROSS-COUNCIL RANKING CLARIFICATION

**Important:** Do **not** treat the idea sets as duplicates too early.

The **Claude Code (CC)** list is an **independent model contribution** and must be preserved as **its own source**, not collapsed into Adam/GPT ideas before scoring.

### Source labels (stable ids)

| Prefix | Meaning |
|--------|---------|
| **A** | Adam / GPT / operator-thread ideas — full text in **`10_IDEAS_OPERATOR_PHASE1.md`** (**A01–A25**) |
| **C** | **Claude Code** independent ideas — **C01–C25** (import into **§6** when the canonical CC list exists in-repo or is pasted below the stub) |
| **N** | **Industry scan** ideas — Conductor pass from session chat (**N01–N25**); one-line summaries in **§5** |
| **G** | **GPT synthesis additions** — only when needed; **G01–G10** in **§7** |
| **O** | **Operator second-pass** items that appeared after Phase 1 freeze — **O01–O02** in **§8** (not a “model”; still first-class for ranking) |

### Per-idea fields (required before final rank)

For **each** id (A*, C*, N*, G*, O*), record:

| Field | Notes |
|--------|--------|
| **source** | `A` \| `C` \| `N` \| `G` \| `O` |
| **overlap_with** | List of other ids that express the same thrust (semantic overlap). **Empty overlap is fine.** |
| **unique_contribution** | What this id adds that its overlaps do **not** fully cover. |
| **strengthens** | Check all that apply: `SSOT` · `Capsule` · `TSOS` · `Lumin` (informal cognition/product umbrella). |
| **activation_vs_redesign** | `activation` (wire/populate/extend existing) vs `redesign` (new substrate / large re-arch). |
| **implementation_risk** | `1` low … `5` high (irreversibility, token burn, governance ambiguity). |
| **time_to_value** | `1` fast slice … `5` long corridor (honest). |
| **`independent_convergence_score`** | **`1`** single source only … **`5`** same conceptual core independently from **A + N + G + (C when present) + operator tier lists**. **Rule:** independent convergence on the same concept **raises** priority — it is **not** a dedupe trigger to delete. |

### Ranking rule

1. Complete **overlap** maps and per-id fields for **all** sources present.  
2. **Rank across all sources** in one ordered list (final column: `rank_global`).  
3. **Do not discard** an idea solely because it overlaps another. If two models independently proposed the same thing, **flag it** and **raise** `independent_convergence_score`.  
4. **First build** row: pick **one** smallest slice after `AUTONOMY_WRITE_LOCK` / collision control (see **§11**) unless operator overrides.

---

## 1. Operator synthesis preserved (input to ranking — not a vote)

The following is **Adam / GPT narrative** to weight Phase 2; it does **not** replace **`run-council`** receipts for constitutional edits.

- **Tier-1 signals (multi-set convergence):** Task DNA / lineage; consequence forecast → outcome → learning; Founder Decoder / calm console; truth drift observatory; **memory activation with a reader** (not theater); governance without paralysis (**safe-but-stuck**).  
- **Dangerous-too-early:** full recursive consequence engine; fully autonomous self-rewrite on `main`; giant knowledge graph first; continuous adversarial council as always-on burn; MCP-wide refactor.  
- **Safe self-improvement shape:** propose → adversarial review → council vote → tests → **staged branch** → runtime monitor → rollback → promote on evidence.  
- **Recommended implementation order (operator):** (1) **`AUTONOMY_WRITE_LOCK`** (O01), (2) Founder Decoder / calm, (3) Task DNA v0, (4) memory activation v1 = seed + **one reader**, (5) prediction/outcome log v1, (6) Agent Identity Cards (O02), (7) governance paralysis score.

---

## 2. `independent_convergence_score` rubric (normative for this file)

| Score | Meaning |
|-------|--------|
| **1** | Appears in **one** source only. |
| **2** | **Two** independent sources (e.g. A + N). |
| **3** | **Three** sources (e.g. A + N + G), or **two** + strong operator-tier callout. |
| **4** | **Four** sources, or **three** + chronicle §9/§10 activation alignment. |
| **5** | **A + N + G + C** (once C is populated) all touch the same conceptual core **with wording independence** — treat as **candidate flagship** (still subject to risk/TTV gates). |

---

## 3. Concept clusters (overlap hints — expand during Phase 2)

Use clusters to fill **`overlap_with`** without merging rows.

| Cluster id | Core concept | Typical members (non-exhaustive) |
|------------|--------------|----------------------------------|
| **CL-DNA** | Task DNA / lineage / queue proof | A06, N13, N14 (partial), operator Tier-1 |
| **CL-FORECAST** | Prediction → outcome → consequence | A02, A03, A12, N06, N07, operator Phase 1–2 sequencing |
| **CL-DECODER** | Founder / calm / cognitive protection | A09, A24, N12, G01, G09, UX modes (AM21 handoff) |
| **CL-DRIFT** | Truth drift / reality anchoring | A04, A23, N19, G03, G10 |
| **CL-MEMORY** | Memory activation / wisdom / decay | A01, A07, A21, A25, N02,N08,N09,N11,N18,N20,N22, chronicle “memory theater” |
| **CL-GOV** | Paralysis / friction / safe-but-stuck | A10, N16, G04 (compression of governance outcomes) |
| **CL-ROUTING** | Adaptive routing / TSOS | A13, A14, N17, AM01 routing |
| **CL-OBS** | Traces / SLO / vendor observability | N01, N21, N24, N25 |
| **CL-IDENTITY** | Agent identity / autonomy tiers | **O02** (operator), industry alignment noted in thread |
| **CL-LOCK** | Collision control / staging | **O01** (`AUTONOMY_WRITE_LOCK`), operator “stop tripping over itself” |

---

## 4. Worksheet template (copy rows for missing C** or new ids)

```text
id | source | one_line | overlap_with | unique_contribution | strengthens | activation_vs_redesign | implementation_risk | time_to_value | independent_convergence_score | rank_global (fill last)
```

---

## 5. N01–N25 — Industry-scan set (Conductor; one line each)

Full prose for these lived in the Conductor chat pass; this table is the **canonical repo capture** for Phase 2.

| Id | One-line |
|----|----------|
| N01 | OTel-shaped GenAI traces across builder/council/Lumin chains |
| N02 | AM39 memory tier tags: episodic / semantic / procedural |
| N03 | Freshness SLA on operational facts + soft compliance when stale |
| N04 | Progressive disclosure retrieval (summary cards before full evidence) |
| N05 | Entity-scoped memory partitions (lane/program/tenant isolation) |
| N06 | Thin forecast→outcome row keyed to proposal or builder task |
| N07 | Evaluation hooks on traces (faithfulness/schema scores beside span) |
| N08 | Graph-light `depends_on_fact_ids[]` before any Neo4j-class move |
| N09 | Human-in-the-loop promotion queue for ladder transitions |
| N10 | Lumin UI: memory citations (fact ids + ladder level) on load-bearing replies |
| N11 | Post-reply micro-feedback → `lessons_learned` + retrieval weight |
| N12 | Founder Decoder v0: calm/strategic/operator strip from existing health JSON |
| N13 | Task DNA v0: optional queue JSON fields + validator script |
| N14 | Unified Command Core nightly export (queue + daemon + compliance + SHA) |
| N15 | Council ledger **view** joining proposals + AM39 debates |
| N16 | Governance paralysis index (advisory noise × idle × deploy gap) |
| N17 | Adaptive route **shadow** canary before flipping defaults |
| N18 | Belief revision: `supersedes_fact_id` chain (no silent delete) |
| N19 | Weekly contradiction sweep: AM39 invariants vs ssot-check / diagnose / legacy JSON |
| N20 | Weekly “wisdom digest” bullet list for operator |
| N21 | Token budget attributes per trace span + P95 alerts |
| N22 | Reflection-bounded retrieval caps by level + relevance |
| N23 | Synthetic adversary regression pack (CI, bounded) |
| N24 | Operator SLO dashboard (p50/p95 for `/build`, `/memory/health`, gate-change) |
| N25 | Vendor-neutral observability mapping doc (OTel semantic conventions path) |

---

## 6. C01–C25 — Claude Code set

**Full text:** [`11_IDEAS_CLAUDE_CODE_PHASE1.md`](11_IDEAS_CLAUDE_CODE_PHASE1.md)  
**Generated:** 2026-05-13, independently — operator idea list not visible during generation.  
**Cap:** `independent_convergence_score` may reach **5** for clusters where C overlaps A + N + G + operator tier.

### C-series cluster crosswalk (for §3 worksheet)

| C id | One-line | Cluster(s) | Expected overlap |
|------|----------|------------|-----------------|
| C01 | Memory ingestion triage (episodic/semantic/procedural classifier) | CL-MEMORY | A01, N02 |
| C02 | lessons_learned cold-start seed from existing receipts + logs | CL-MEMORY | A01, N11 |
| C03 | Memory citation requirement on load-bearing outputs | CL-MEMORY | N10 |
| C04 | Pre-build outcome declaration (success_criteria, failure_signals, expected_tokens) | CL-FORECAST | A02, N06 |
| C05 | Outcome delta score (spec_fidelity, surprise_count, repair_needed) | CL-FORECAST | A03, N07 |
| C06 | SSOT amendment drift alert (Last Updated vs git log mismatch) | CL-DRIFT | A04, N19 |
| C07 | Governance friction meter (advisory/proposal ratio, friction_score) | CL-GOV | A10, N16 |
| C08 | Task provenance chain (parent_task_id schema enforcement) | CL-DNA | A06, N13 |
| C09 | Build closure contract (commit SHA or explicit reason + node --check required) | CL-DNA | A06, SIS1 |
| C10 | Operator cognitive state signal (3-state: fresh/overloaded/crisis) | CL-DECODER | G09, A24 |
| C11 | Builder call trace index (consolidated cross-lane JSONL or DB) | CL-OBS | N01, N24 |
| C12 | Repeated failure incident report (human-readable at FPM1 level 3) | CL-OBS | FPM1 |
| C13 | Constitutional reference tagging ([§2.6] as machine-readable metadata) | — new — | A07 (machine-law) |
| C14 | Structured session handoff generator (auto-query receipts → handoff block) | — new — | N14 |
| C15 | Staged hunk commit enforcer (pre-commit: hunk → work item mapping) | CL-LOCK | O01, hunk-audit rule |
| C16 | Epistemic fact freshness SLA (STALE tag at >30d unconfirmed, level ≥ 3) | CL-DRIFT | N03, G10 |
| C17 | Memory write gate — reader-first contract (block writes if no reads in 7d) | CL-MEMORY | — new — |
| C18 | Repair token cost ledger (estimated vs actual tokens per repair) | CL-OBS | A18, A19 |
| C19 | Spec richness pre-flight gate (reject underspecified tasks before council call) | CL-DNA | N13 |
| C20 | Canary build lane (shadow execution before git push, no cursor advance) | — new — | N17 |
| C21 | AUTONOMY_WRITE_LOCK concrete implementation (data/autonomy.lock file) | CL-LOCK | O01 |
| C22 | Model affinity registry (task_affinities[] + trace-informed routing) | CL-ROUTING | A13, N17 |
| C23 | Governance decision timeline (queryable: proposals → votes → receipts → gaps) | CL-GOV | A10, N16 |
| C24 | Token efficiency ratio TER (tokens / outcome_delta_score per task) | CL-OBS | A19, G01 |
| C25 | Anti-pattern signature catalog (spec matching → targeted hint injection) | CL-MEMORY | G05, FPM1 |

---

## 7. G01–G10 — GPT synthesis add-ons (operator thread)

| Id | One-line |
|----|----------|
| G01 | Cognitive load budget — human info absorption, ignored volume, unresolved count, time-since-clarity → dynamic output compression |
| G02 | Decision temperature — urgency, reversibility, blast radius, confidence, emotional load, fatigue risk → autonomy aggressiveness |
| G03 | Reality anchoring score — runtime evidence, recent verification, external proof, telemetry consistency, contradiction count |
| G04 | Institutional wisdom compression — monthly: 10 truths, 5 anti-patterns, 3 emerging risks |
| G05 | Cognitive immune system — meta layer for repeating failures, mutating patterns, toxic memory, failing assumptions |
| G06 | Strategic patience engine — intentional delay when confidence low / blast high / stale evidence / strong disagreement |
| G07 | Multi-horizon planning — 24h / 30d / 6mo / 2yr horizons per major initiative |
| G08 | Wisdom weighting — proven lessons gain retrieval/routing/governance weight; noisy lessons decay |
| G09 | Operator emotional context (operational) — overwhelmed/exploratory/exhausted/crisis/strategic/deep-work → verbosity/escalation/pacing |
| G10 | Truth aging — freshness, confidence drift, last challenge, last runtime confirmation |

---

## 8. O01–O02 — Operator second-pass (post Phase-1 freeze)

| Id | One-line |
|----|----------|
| O01 | **`AUTONOMY_WRITE_LOCK`** — pause autonomous `main` pushes / route to staging when human or governance repair slice is active (chronicle §16 addendum) |
| O02 | **Agent Identity Cards** / autonomy tiers — identity, scopes, shutdown paths, accountability (industry: Okta/Ping-style agent governance framing; **spec not shipped** here) |

---

## 9. Conductor draft — global rank (C** now integrated)

**THINK:** Ordering biases toward **operator’s collision-control + activation-first** mandate and chronicle evidence. `independent_convergence_score` (ICS) computed from A+N+G+C+operator sources. **Replace** after full worksheet + optional **`run-council`** on disagreements above rank 5.

| rank_global | id cluster | ICS | rationale (short) |
|-------------|-----------|-----|---------------------|
| **1** | **O01** / **C21** | 4 | Self-collision blocker. C21 is the concrete impl. Both needed; build together. |
| **2** | **A06** / **N13** / **C08** / **C09** | 5 | Task DNA — highest ICS: A+N+operator+C all arrived independently. C08 adds schema enforcement; C09 adds closure proof. Together = complete. |
| **3** | **A01** / **C02** / **N11** / **N20** | 5 | Memory activation — but only if C17 (write gate) enforces reader-first. C02 solves cold-start (INERT). Highest leverage per token. |
| **4** | **A09** / **N12** / **C10** / **G09** | 4 | Founder Decoder / cognitive protection. C10 (3-state signal) is a fast v0; G09 is the full model. Build C10 first, migrate to G09 later. |
| **5** | **A02** / **A03** / **N06** / **C04** / **C05** | 5 | Prediction → outcome → learning. C04 (declaration) + C05 (delta score) = the write path. A02/A03/N06 = the read path. Complete loop. |
| **6** | **A10** / **N16** / **C07** / **C23** | 4 | Governance friction / paralysis. C07 is the metric; C23 is the timeline query. Together they make paralysis observable. |
| **7** | **C19** / **C04** | 3 | Spec richness gate — upstream quality control. Blocks the single largest source of bad council output. Cheap to build, high signal. |
| **8** | **N01** / **N24** / **C11** / **C18** | 4 | Observability spine. C11 (trace index) + C18 (repair ledger) + N01 (OTel shape) + N24 (SLO dashboard). Build C11 first as substrate. |
| **9** | **A04** / **N19** / **G03** / **G10** / **C06** / **C16** | 5 | Truth drift / freshness. C06 (amendment drift alert) + C16 (epistemic SLA) are the AM39-specific implementations. High ICS confirms this cluster. |
| **10** | **G05** / **C25** | 3 | Cognitive immune / anti-pattern catalog. C25 is the concrete substrate for G05. Block until FPM1 has 30+ entries worth mining. |
| **11** | **O02** | 2 | Agent identity cards — scale governance. Right shape; wait for AM39 memory + AM01 routing to stabilize first. |
| **12** | **A14** / **N14** / **C14** | 3 | Session handoff + nightly export. C14 (auto-generate handoff) is lowest-effort highest-relief for session continuity. |
| **13** | **A13** / **N17** / **C22** | 3 | Adaptive routing / affinity. C22 (affinity registry) requires C11 trace data — sequence after observability. |
| **14** | **C13** | 1 | Constitutional reference tagging. Unique C contribution; high long-term value; low urgency. |
| **15** | **C15** | 2 | Hunk commit enforcer — automates the new manual hunk-audit rule. Tooling-level hygiene. |
| **16** | **C17** | 1 | Memory write gate — enforces reader-first contract. Unique concept; build after C02 confirms readers exist. |
| **17** | **C20** | 1 | Canary build lane — needs C09 + C11 first. Sequence after rank 8 items are live. |
| **18** | **C12** | 2 | Failure incident report — FPM1 level 3 human summary. Small scope; high operator value when level 3 first triggers. |
| **19** | **C24** / **G01** | 3 | Token efficiency ratio. Needs C11 trace data. Sequence after observability spine. |

*Ideas not yet ranked (pending operator review):* A05, A08, A11, A12, A15, A16, A17, A18, A20, A21, A22, A25, G02, G04, G06, G07, G08, N02–N05, N08–N10, N15, N18, N21–N23, N25.

---

## 10. First build — **OPERATOR-FINALIZED SEQUENCE** (2026-05-13)

Adam's final verdict: anatomy exists, physiology is missing. Phase 3 is **activation, not architecture.**

**Agreed rationale:** prevent collision → activate memory → require closure proof → add lineage → learn from prediction errors → make it readable to Adam.

| Order | Slice | Ids | What gets built | Why this order |
|-------|-------|-----|-----------------|----------------|
| **1** | AUTONOMY_WRITE_LOCK | O01 + **C21** | `data/autonomy.lock` — daemon checks before any `git push`; commits route to `autonomy/staging` when locked; lock cleared by confirmation event | Safety rail. Every improvement gets messier without it. Boring = good. |
| **2** | Memory bootstrap + reader | **C02** + N11 | `npm run memory:seed` backfill from receipts + CONTINUITY_LOG; ONE live reader confirmed (operator:status or citation output) | Activates AM39 from INERT. Reader-first enforced (C17 gate) prevents memory theater. |
| **3** | Build Closure Contract | **C09** | Tasks cannot advance cursor without: (commit SHA OR explicit reason) AND node --check pass | Proves the loop. Each task closed = verified, not assumed. |
| **4** | Task DNA v0 | A06 + N13 + **C08** | Optional `parent_task_id`, `why`, `proof_to_close` fields on queue JSON + validator | Kills ghost-task chaos. Highest ICS in the catalog (score 5). |
| **5** | Prediction vs Outcome v0 | A02 + **C04** + C05 | Pre-build outcome declaration + thin outcome delta log | Opens the learning loop. System starts accumulating evidence for routing + routing optimization. |
| **6** | Founder Decoder v0 | A09 + N12 + **C10** | 3-state cognitive signal + render-only calm/strategic/operator view on existing JSON | Kept near top per Adam: founder readability matters. System usable → founder not bottleneck. Not before the lock — but not far after. |

**Do not start:** full wisdom graph (A25), recursive consequence engine (A12), all-day adversarial council (A08), Neo4j, canary lane (C20) before C09+C11 — see §1 danger list.

**First single commit:** C21 alone — `data/autonomy.lock` check in the daemon before `git push`, ~30 lines, zero behavioral change when lock absent.

---

## 11. Changelog

| Date | Change |
|------|--------|
| 2026-05-13 | Initial Phase-2 file: CAI instruction block, A/N/G/O capture, C stub, clusters, draft rank, first-build default. |
| 2026-05-13 | C01–C25 populated: `11_IDEAS_CLAUDE_CODE_PHASE1.md` created; §6 stub replaced with cluster crosswalk table; §9 global rank updated with ICS scores (A+N+G+C all sources); §10 first-build updated to 5-slice implementation sequence + single-smallest-slice recommendation (C21). |
| 2026-05-13 | §10 finalized: operator accepted CC anatomy/physiology read; agreed sequence: C21 → C02+reader → C09 → Task DNA → Prediction loop → Founder Decoder. Rationale locked: activate existing organs, not more architecture. |

---

*End Phase 2 ranking scaffold — complete worksheet + import C** before treating ranks as final.*
