<!-- SYNOPSIS: Memory Architecture Archaeology -->

# Memory Architecture Archaeology

> **Governance supersession (2026-06-09):** Deliberation/org vocabulary sealed in **`docs/BUILDEROS_VOCABULARY.md` v2.7** + **`docs/architecture/DELIBERATION_ARCHITECTURE.md`**. This archaeology doc remains valid for memory surfaces; dept count is now **seven** (CDR, CFO).

**Agent role:** Historian / Architecture Archaeologist  
**Mission date:** 2026-05-24  
**Scope:** Entire Lumin / LifeOS / LimitlessOS / BuilderOS / TSOS corpus  
**Method:** Repo-wide search — not limited to files named `memory`, `historian`, or `SSOT`  
**Status:** Archaeology only — **no new architecture proposed**

---

## Executive finding

The project does **not** have one memory system. It has **six parallel memory surfaces**, **three trust/confidence ladders**, and **four write paths** that agents still conflate. The **mature design** (Amendment 39 + Memory Framework Design Brief + Memory Authority Map) is real and partially implemented. The **operational pain** is sparse population, duplicate naming, and doc/code drift — not absence of vision.

**Founder hypothesis (supported by archaeology):** The core system may be **Evidence → Confidence → Truth → Law**, with memory as the **preservation mechanism** for evidence — not memory as the organizing noun. See [`TRUTH_SYSTEM_ARCHITECTURE.md`](TRUTH_SYSTEM_ARCHITECTURE.md).

---

## A. Existing memory systems discovered

### A1. Canonical production systems (ratified authority)

| System | Classification | Store / routes | Code | SSOT |
|--------|----------------|----------------|------|------|
| **Amendment 39 Evidence Engine** | `BUILDEROS_EVIDENCE_MEMORY` | `epistemic_facts`, `fact_evidence`, `debate_records`, `lessons_learned`, `agent_performance`, `intent_drift_events` · `/api/v1/memory/evidence/*` | `services/memory-intelligence-service.js`, `routes/memory-intelligence-routes.js` | `AMENDMENT_39_MEMORY_INTELLIGENCE.md`, `MEMORY_FRAMEWORK_DESIGN_BRIEF.md` |
| **Amendment 02 Capsule Memory** | `PRODUCT_MEMORY` | `memory_capsules`, `memory_use_receipts`, `contradiction_records`, `working_memory_entries` · `/api/v1/memory/capsules/*` | 19 `services/memory-*.js` files + `routes/memory-capsule-routes.js` | `AMENDMENT_02_MEMORY_SYSTEM.md`, `config/memory-truth-classes.js` |
| **Self-Repair Memory Loop** | `SELF_REPAIR_MEMORY` | `self_repair_memory_events`, `data/self-repair-memory.jsonl` · `/api/v1/memory/self-repair/*` | `services/self-repair-memory.js` + executor chain | `AMENDMENT_36`, `BUILDER_RELIABILITY_EPISTEMIC_BRIDGE.md` |
| **Memory Authority Map** | Governance | N/A (doc) | Enforced by `builderos-system-alpha-readiness.js`, `MEMORY_PROOF_CONTRACT.md` | `docs/architecture/MEMORY_AUTHORITY_MAP.md` |

### A2. Production adjacent (memory-like, separate authority)

| System | Purpose | Store / routes | Status |
|--------|---------|----------------|--------|
| **Conversation Store** | Session history, search, summarize | `conversations`, `conversation_messages` · `/api/v1/history/*` | Production — not evidence ladder |
| **Lumin threads** | Product chat persistence | `lumin_threads` + messages | Production via `lifeos-lumin.js` |
| **Command Center comms (C2)** | Operator chat log | `command_center_communications` | Production — explicitly NOT `epistemic_facts` |
| **LifeOS event stream** | Paste/capture for commitments | `lifeos_event_stream` | Production — product evidence input |
| **Knowledge context injection** | SSOT/doc injection into council | `knowledge-context.js`, `core/knowledge-base.js` | Production — doc-truth layer |
| **OIL / Builder truth surfaces** | Deploy truth, proof freshness, rollback DNA | `builder_truth_surfaces`, `builder_task_receipts`, `security_receipts`, `builder_replay_baselines` | Production — builder operational memory |
| **Founder Decision Ledger** | Control-plane decisions | `founder_decision_ledger` | Partial wiring |
| **Outcome tracker** | Feature ROI / twin outcomes | `outcomes`, `build_outcomes` | Production — domain-specific |
| **Integrity / Word Keeper** | Personal promise tracking | `integrity_scores`, `integrity_events` | Production |
| **Truth delivery log** | Calibrated truth to user | `truth_delivery_log` | Production |
| **ChatGPT import** | External conversation → commitments | Parses export JSON | Service exists |
| **Lumin memory fetcher** | GitHub dump import | `• Lumin-Memory/00_INBOX/raw/` | Partial |

### A3. Factory / TSOS stack (separate runtime)

| System | Purpose | Store | Status |
|--------|---------|-------|--------|
| **Factory Historian** | Mission step append-only ledger | `factory-staging/data/historian-records.jsonl` | Partial — `append-record.js` writes; `record-*` stubs return shapes only |
| **Factory memory trust levels** | observed → trusted (5 levels) | Doc only | `factory-staging/factory-core/historian/memory-trust-levels.md` |
| **TSOS step metrics** | Step performance JSONL | `data/tsos-step-metrics.jsonl` | Factory |
| **Builder failure memory (FPM1)** | Ephemeral failure patterns | `data/builder-failure-lessons.jsonl` | Ephemeral — resets on redeploy |
| **Prediction loop S5** | Builder autonomy calibration | `scripts/lib/prediction-loop.mjs` | Partial |
| **Drift Sentinel** | Council consensus drift | `audit/drift/`, CLI | Local-only, not production-mounted |

### A4. Legacy / compat (still callable)

| System | Store | Routes | Notes |
|--------|-------|--------|-------|
| **Legacy CRUD memory** | `data/memories.json` | `/api/memories`, `/api/v1/memory/legacy/*` | `core/memory-system.js` — still feeds `knowledge-context.js` |
| **conversation_memory table** | Neon | Legacy compat paths | Pre-capsule era; `MEMORY_SYSTEM_COMPLETE.md` claims it was primary |
| **system_source_of_truth table** | Neon | `core/source-of-truth-manager.js` | Archived in AM02 narrative |
| **Snapshot rollback** | File snapshots | `/api/v1/rollback/:snapshotId` | System state, not epistemic memory |

### A5. Conversation / dump archives (not runtime memory)

| Corpus | Location | Role |
|--------|----------|------|
| **Lumin-Memory inbox** | `Lumin-Memory/00_INBOX/raw/`, `• Lumin-Memory/...` | GPT/Gemini/Grok dumps — idea vault input |
| **Idea vault index** | `AMENDMENT_38_IDEA_VAULT.md`, `CONVERSATION_DUMP_IDEAS_INDEX.md` | Catalog of brainstorm archaeology |
| **Institutional digest** | `docs/INSTITUTIONAL_MEMORY_DIGEST.md` | Lessons extracted from repair receipts |
| **Brainstorm sessions** | `docs/projects/BRAINSTORM_SESSIONS/` | Capsule-SSOT convergence chronicle, TSOS platform |
| **PSSOT missions** | `builderos-reboot/MISSIONS/*/PSSOT.md` | Human dump → blueprint handoff |
| **Founder packet / blueprint pack** | `docs/architecture/factory-v1-blueprint-pack/` | Doctrine — not runtime authority |
| **memories.json embedded dumps** | `data/memories.json` | 3 duplicate v1.0 SOT exports (~10MB each) with stale "Notion page" authority |

### A6. Personal / therapeutic "memory" (different domain word)

| System | Meaning of "memory" | Code |
|--------|---------------------|------|
| **Memory healing** | Therapeutic grief/regression sessions | `services/memory-healing.js`, `memory_palace` table |
| **Memory relationship gates** | Relationship-sensitive truth_class guards | `services/memory-relationship.js` |
| **Interaction Evidence Engine** | Local-first life evidence + coaching | `docs/LIFEOS_CONVERSATION_EVIDENCE_SSOT.md` |
| **Relationship debrief / mediation** | Post-conflict reflection | `relationship-debrief.js`, `mediation-engine.js` |
| **Contradiction / identity engine** | Belief archaeology | `contradiction-engine.js` |

---

## B. Abandoned memory ideas worth revisiting

| Idea | Where found | Why revisit | Current gap |
|------|-------------|-------------|-------------|
| **Conscious / subconscious split** | `MEMORY_FRAMEWORK_DESIGN_BRIEF.md` §2 | Correct mental model for token + trust | No universal "conscious pack" module; `memory-working.js` orphan |
| **Devil's Advocate promotion gate** | Design brief §4; AM39 `debate_records` | Separates "not disproven" from "attacked and held" | Gate exists in schema; not universal on all promotions |
| **Contested fact / full debate record** | Design brief §5 | Highest-value ambiguous truth | `debate_records` table; sparse use |
| **Truth decay tied to code churn** | Design brief §3; `decay_rate` column | Prevents stale facts acting as law | Column exists; **no scheduled decay worker** |
| **Memory zombie quarantine** | `services/memory-zombie.js` | Auto-quarantine expired capsules | Implemented in pipeline; bench-heavy |
| **Working memory replay + discard unused** | `services/memory-working.js` | Conscious-layer discipline | **Not exposed via API** |
| **Intent drift as first-class memory** | AM39 `intent_drift_events`; §2.11b | Catches ask vs deliver | Writer exists; not universal on all agent paths |
| **Evidence Before Interpretation (product)** | `LIFEOS_CONVERSATION_EVIDENCE_SSOT.md` | Core C2 / coaching doctrine | Doc-strong; partial code |
| **Temporal Adversary council role** | `council/roles/temporal_adversary.js` | "Two years later" slow-failure lens | Exists; not default on all council runs |
| **Builder task DNA rollback_path + replay baselines** | `builder-truth-surface.js` | Operational undo for builder | Tables exist; drill partial |
| **S5 Prediction Loop** | `scripts/lib/prediction-loop.mjs`, AM36 | Calibrate autonomy predictions | Partial; factory stubs duplicate intent |
| **Institutional digest → epistemic seed** | `INSTITUTIONAL_MEMORY_DIGEST.md`, `npm run memory:seed-lessons` | Operational wisdom already extracted | Pipeline exists; thin population |
| **Micro Protocol / LCTP compression** | `HISTORICAL_CONCEPTS_FOUND.md`, `MicroProtocol.js` | Context preservation at scale | Under-integrated into council calls |
| **Human Simulated Council** | Embedded in `data/memories.json` §15.19 | Historical lens on decisions | Vision dump only |
| **FPM1 → Neon migration** | AM36 digest | Durable failure lessons | Still ephemeral JSONL |
| **Adaptive communication profile + personal idiom** | AM21 backlog | Anti-formulaic, sounds like user | Partial via `communication-profile.js` |
| **Victory Vault (real-voice replay)** | AM21 backlog #15 | Proof over generic encouragement | Spec'd; not shipped UI |
| **Relationship integrity accounting** | AM21 backlog #16 | Dyadic promise mirror | Spec'd; partial household infra |
| **Programs map from interaction evidence** | `LIFEOS_CONVERSATION_EVIDENCE_SSOT.md` | Cross-program pattern detection | Doc + partial services |

---

## C. Memory concepts only found in conversations

These appear primarily in **conversation dumps**, **PSSOTs**, **idea vault**, or **embedded JSON visions** — not as implemented runtime:

| Concept | Source corpus | Notes |
|---------|---------------|-------|
| **Infinite memory / collective intelligence** | Lumin-Memory dumps, brainstorm catalog | Aspirational; not chosen as v1 architecture |
| **Memory as moat / compounding institutional knowledge** | `MEMORY_FRAMEWORK_DESIGN_BRIEF.md` §1 | Strategic framing — doctrine, not table |
| **"Grow right not fast" memory discipline** | Design brief header | Cultural principle |
| **Notion-as-SSOT (historical)** | `data/memories.json` embedded text | Superseded by NSSOT + amendments |
| **Phone/voice as memory capture** | `HISTORICAL_CONCEPTS_FOUND.md` | Twilio placeholder; incomplete |
| **Failure museum complement to Victory Vault** | AM21 backlog | Paired concept — doc only |
| **Anchored declarations (signed life statements)** | AM21 backlog #25 | Integrity anchor — not built |
| **Emotional Wealth Engine** | AM21 Layer 5 | Emotional capital tracking — backlog |
| **Cycle-aware decision guard** | AM21 differentiators #1 | Requires health + cycle + decisions fusion |
| **Family integrity rollup** | AM21 #7 | Household opt-in aggregate |
| **Real-voice Victory Vault** | AM21 #15 | Local-first audio proof |
| **PSSOT as human dump zone → blueprint** | C2 mission PSSOT | Process memory, not product store |
| **Historian as AI agent identity** | User mission brief (this doc) | Role definition — overlaps factory Historian name |
| **Evidence → Confidence → Truth → Law chain** | Founder insight (2026-05-24) | Reframe — see TRUTH_SYSTEM_ARCHITECTURE.md |
| **Kingsman-style operational memory** | `AMENDMENT_33_KINGSMAN_PROTOCOL.md` | Protocol memory — separate lane |
| **Capsule-SSOT convergence** | `2026-05-13_capsule-ssot-convergence/` | Chronicle of authority fight — historical |

---

## D. Memory concepts already implemented in code

| Concept | Implementation evidence |
|---------|-------------------------|
| Epistemic evidence ladder (0–6) | `memory-intelligence-service.js`, migrations |
| Fact promotion/demotion | `promoteFact`, `demoteFact`, `addEvidence` |
| Provenance chains | `memory-provenance.js`, `buildProvenanceChain` |
| Capsule trust tiers | `memory_capsules.trust_level`, `memory-trust-bridge.js` |
| Truth classes (10 types) | `config/memory-truth-classes.js` |
| Contradiction quarantine | `memory-contradiction.js`, `contradiction_records` |
| Memory use receipts | `memory-receipts.js` |
| Self-repair → epistemic bridge | `self-repair-memory.js` writes facts/lessons |
| Agent performance / routing | `agent_performance`, `getRoutingRecommendation` |
| Protocol violations tracking | `agent_protocol_violations` |
| Intent drift events | `recordIntentDrift` |
| Stale hypothesis view | `stale_hypotheses` view |
| OIL proof freshness | `oil-proof-freshness.js` |
| Security receipts | `oil-security-receipts.js` |
| Builder replay baselines | `builder_replay_baselines` table |
| Conversation persistence | `conversation-store.js` |
| Legacy memory CRUD | `core/memory-system.js` |
| Knowledge injection to council | `knowledge-context.js` → every `callCouncilMember` |
| Integrity scoring | `integrity-engine.js` |
| Truth delivery + variety | `truth-delivery.js`, `response-variety.js` |
| Lumin epistemic contract | `LUMIN_EPISTEMIC_CONTRACT` in `lifeos-lumin.js` |
| Decision logging | `decision-intelligence.js`, `decision-ledger.js` |
| ChatGPT export import | `chatgpt-import.js` |
| Epistemic fact seeding | `scripts/seed-epistemic-facts.mjs`, boot seed |
| Memory CI evidence | `npm run memory:ci-evidence` |
| Alpha readiness memory proof | `builderos-system-alpha-readiness.js` Phase B |
| Factory historian append | `append-record.js` → JSONL |
| Gate-change THINK/GUESS labeling | `lifeos-gate-change-proposals.js` |
| LCL symbol drift rollback | `lcl-monitor.js` on council calls |

---

## E. Memory concepts only implemented in documentation

| Concept | Doc location | Code gap |
|---------|--------------|----------|
| Conscious pack (always-loaded map) | Design brief §2 | No single runtime module |
| Universal retrieval discipline | Design brief §3 | Partial — capsule retrieval only |
| Devil's advocate as mandatory promotion gate | Design brief §4 | Schema yes; enforcement sparse |
| Truth decay automation | Design brief §3; AM39 backlog | Column only |
| Governance ladder (Observation→Foundational Law) | NSSOT §2.0B | Doc-ratified only — correct by design |
| Historian prediction/outcome/lesson records | Factory historian spec | Stubs return objects; no DB |
| Interaction Evidence Engine (full) | `LIFEOS_CONVERSATION_EVIDENCE_SSOT.md` | Modes 0–3 partially specified |
| Programs map as live navigation | `LIFEOS_PROGRAM_MAP_SSOT.md` | Hub doc; queue separate |
| BPB determinism / blueprint sufficiency | NSSOT §2.0E | Process law |
| Mission state machine | NSSOT §2.0D | Partial in factory missions |
| Zero-drift handoff 6-role model | AM36 | Protocol doc > universal automation |
| Memory proof contract maturity levels | MEMORY_PROOF_CONTRACT | Code updated; data often WIRED/LIVE only |
| Personal idiom layer | AM21 backlog | Not productized |
| Victory Vault / Failure museum UI | AM21 | Backlog |
| Relationship integrity accounting | AM21 | Spec only |
| Emotional Wealth Engine | AM21 | Backlog |
| Factory memory trust levels (5-tier) | `memory-trust-levels.md` | Not wired to Neon |
| PSSOT → BPB handoff | C2 mission docs | Process, not store |

---

## F. Duplicate systems solving the same problem

| Problem | Competing implementations | Resolution status |
|---------|---------------------------|-------------------|
| **Store "what we know"** | `memories.json`, `conversation_memory`, `memory_capsules`, `epistemic_facts`, `self_repair_memory_events`, historian JSONL, `builder-failure-lessons.jsonl` | Authority map resolves **scoring**; writes still fan out |
| **Trust / confidence** | AM39 level 0–6, capsule `trust_level`, factory `observed→trusted`, legacy `confidence` 0–1, NSSOT §2.0B 0–5 | Three+ ladders; bridge covers capsule↔epistemic only |
| **Lessons learned** | `lessons_learned`, institutional digest, FPM1 JSONL, self-repair JSONL, factory `record-lesson.js` | No single ingestion path |
| **Prediction / outcome** | AM39 `agent_performance`, factory record stubs, prediction-loop.mjs, ML predictors | Overlapping vocabulary, partial wiring |
| **Drift detection** | `intent_drift_events`, Drift Sentinel, AM36, `memory-institutional.js` (broken) | Product vs council vs operator |
| **Historian** | Factory JSONL, AM39 historian spec, archaeology agent role | Name collision |
| **Receipts** | SSOT Change Receipts (md), `memory_use_receipts`, `fact_evidence`, OIL receipts, operator JSONL | Same word, different stores |
| **Promotion** | Epistemic auto-promotion vs `core/promotion-engine.js` (**marketing!**) | Dangerous name collision |
| **Knowledge injection** | `knowledge-context.js` (legacy JSON + docs) vs capsule retrieval vs epistemic query | Three read paths |
| **Authority maps** | `docs/architecture/`, `factory-staging/`, `builderos-reboot/`, `lumin-factory-bundle/` | Same doc × 4+ trees |

---

## G. Contradictions between old and new systems

| Topic | Old claim | New claim | Risk |
|-------|-----------|-----------|------|
| Primary memory | `MEMORY_SYSTEM_COMPLETE.md`: "FULLY FUNCTIONAL", `conversation_memory` | Authority map: `epistemic_facts` for proof; capsules for product | Cold agents read Jan 2026 doc first |
| AM02 scope | All memory under Amendment 02 | AM02 = capsules only; evidence → AM39 | Scope confusion |
| memories.json | Writable primary store | Import-only legacy bridge | Still writable; feeds council |
| Self-repair as proof | Repair event counts elevated maturity | MEMORY_PROOF_CONTRACT forbids | Fixed in code; mindset may linger |
| Truth ladder naming | NSSOT §2.0B: Observation→Foundational Law | AM39: CLAIM→INVARIANT | **Intentionally separate** — easy to merge wrongly |
| Single SSOT | JSON dumps cite Notion page | NSSOT + amendments | Stale embedded authority |
| Memory healing vs intelligence | Both say "memory" | Healing = therapeutic; AM39 = institutional | Namespace collision |
| Factory vs production | Blueprint pack = greenfield | Production spine has real AM39 + capsules | Two truths in one repo |
| Historian predictions | AM39: "Without prediction, there is memory" | Factory stubs don't persist | Spec vs stub |
| C2 comms vs evidence | Could be treated as memory | Explicitly NOT epistemic_facts | Product split-brain on commitments tables too |

---

## H. Concepts forgotten but appear high-value

Ranked by archaeology (see Top 50 for full scoring):

1. **Evidence → Confidence → Truth → Law** reframe (founder insight — unifies scattered systems)
2. **Conscious/subconscious + conscious pack** (design brief — fixes token + stale-weight problem)
3. **Devil's Advocate gate + contested fact records** (robustness evidence, not just level number)
4. **Truth decay on churn** (prevents archaeology noise becoming operational truth)
5. **Intent drift events** (§2.11b enforcement in memory, not just prose)
6. **Evidence Before Interpretation** (product doctrine for C2 / coaching — separates raw from interpretation)
7. **Memory trust bridge** (prevents capsule CANONICAL bypass of evidence floor)
8. **OIL proof freshness + security receipts** (operational truth for builder — already production)
9. **Institutional digest → seed pipeline** (lessons already extracted, under-populated)
10. **Temporal Adversary** (slow-failure lens missing from most council runs)
11. **Working memory replay** (session discipline — built but orphaned)
12. **Micro/LCTP context compression** (scale path for conscious pack)
13. **Victory Vault / real-voice proof** (user outcome — anti-generic-encouragement)
14. **Relationship integrity accounting** (marriage/household mirror — AM21 differentiator)
15. **Programs map from interaction evidence** (cross-program growth memory)

---

## I. Concepts that should be permanently retired

| Retire / freeze | Reason |
|-----------------|--------|
| **`data/memories.json` as writable store** | 3 stale duplicates; authority map says legacy |
| **`MEMORY_SYSTEM_COMPLETE.md` as operational truth** | Pre-capsule; contradicts May 2026 authority |
| **Repair log count for alpha proof** | MEMORY_PROOF_CONTRACT explicit ban |
| **`core/promotion-engine.js` in epistemic context** | Marketing engine — name collision |
| **`core/bug-learning-system.js` parallel track** | Orphan; duplicates AM39 path |
| **Duplicate factory bundle trees as authority** | `lumin-factory-bundle/` superseded |
| **Legacy `/api/v1/memory/search` for BuilderOS proof** | LEGACY_COMPAT tag |
| **"Single source of truth: Notion page"** in JSON dumps | Superseded |
| **Unscoped "memory" in new specs** | Use `BUILDEROS_VOCABULARY.md` truth classes |
| **conversation_memory as canonical narrative** | Archived in AM02 |
| **knowledge_base_files / system_source_of_truth as live SSOT** | Archived |
| **Treating C2 comms table as epistemic store** | Authority violation |
| **FPM1 JSONL as durable institutional memory** | Ephemeral by design |

---

## J. Top 50 memory-related concepts (ranked)

Scoring dimensions (1–5 each, combined for rank): **long-term value**, **uniqueness**, **drift reduction**, **truth detection**, **user outcomes**.

| Rank | Concept | Primary location | L | U | D | T | O | Notes |
|------|---------|------------------|---|---|---|---|---|-------|
| 1 | **Evidence → Confidence → Truth → Law chain** | Founder reframe + design brief + NSSOT | 5 | 5 | 5 | 5 | 4 | Core architecture hiding under "proof" not "memory" |
| 2 | **Epistemic evidence ladder (CLAIM→INVARIANT)** | AM39, design brief | 5 | 5 | 5 | 5 | 3 | BuilderOS canonical proof |
| 3 | **Memory Authority Map (four surfaces)** | `docs/architecture/MEMORY_AUTHORITY_MAP.md` | 5 | 4 | 5 | 4 | 3 | Stops false "memory done" |
| 4 | **Memory Proof Contract** | `MEMORY_PROOF_CONTRACT.md` | 5 | 4 | 5 | 5 | 2 | Honest maturity scoring |
| 5 | **Evidence Before Interpretation** | `LIFEOS_CONVERSATION_EVIDENCE_SSOT.md` | 5 | 5 | 4 | 5 | 5 | Product truth doctrine |
| 6 | **Conscious / subconscious split** | Design brief §2 | 5 | 5 | 4 | 4 | 4 | Token + trust model |
| 7 | **Devil's Advocate promotion gate** | Design brief §4, AM39 | 5 | 5 | 4 | 5 | 3 | Attack logged as evidence |
| 8 | **Contested fact / debate records** | Design brief §5, `debate_records` | 5 | 5 | 4 | 5 | 3 | Ambiguity as structured memory |
| 9 | **NSSOT Governance ladder (separate from evidence)** | §2.0B–C | 5 | 4 | 5 | 4 | 3 | Law by process not trial count |
| 10 | **Provenance on every retrieval** | `memory-provenance.js` | 5 | 4 | 5 | 5 | 3 | "Where truth lives" |
| 11 | **Memory trust bridge (capsule↔epistemic)** | `memory-trust-bridge.js` | 5 | 4 | 5 | 5 | 3 | Blocks trust bypass |
| 12 | **Intent drift events (§2.11b)** | AM39, `intent_drift_events` | 5 | 4 | 5 | 4 | 4 | Ask vs deliver in memory |
| 13 | **OIL proof freshness + security receipts** | `oil-proof-freshness.js` | 5 | 4 | 5 | 5 | 2 | Builder operational truth |
| 14 | **Self-repair → epistemic bridge** | `self-repair-memory.js` | 5 | 4 | 4 | 5 | 2 | Lessons become facts |
| 15 | **Scope on every fact (context_required, false_when)** | Design brief §3 | 5 | 4 | 5 | 5 | 3 | Prevents misleading correctness |
| 16 | **Truth decay tied to churn** | Design brief; `decay_rate` | 5 | 4 | 5 | 5 | 2 | Schema only — high value if built |
| 17 | **Memory use receipts** | `memory_use_receipts` | 4 | 4 | 5 | 4 | 3 | Audit what influenced decisions |
| 18 | **Agent protocol violations** | AM39 enforcement tables | 4 | 4 | 5 | 4 | 2 | Agent honesty in memory |
| 19 | **Change Receipts (SSOT evolution memory)** | All amendments | 5 | 3 | 5 | 3 | 2 | Law evolution trail |
| 20 | **PSSOT → BPB blueprint evolution** | C2 mission, NSSOT §2.0E | 5 | 4 | 5 | 3 | 4 | Human dump → deterministic build |
| 21 | **Interaction Evidence Engine** | Conversation evidence SSOT | 5 | 5 | 4 | 4 | 5 | LifeOS product core |
| 22 | **Programs map** | `LIFEOS_PROGRAM_MAP_SSOT.md` | 4 | 4 | 4 | 3 | 5 | Navigation + growth memory |
| 23 | **Integrity / Word Keeper** | `integrity-engine.js` | 4 | 4 | 3 | 4 | 5 | Personal promise memory |
| 24 | **Victory Vault (real proof replay)** | AM21 backlog | 5 | 5 | 3 | 4 | 5 | Anti-generic encouragement |
| 25 | **Relationship integrity accounting** | AM21 #16 | 5 | 5 | 3 | 4 | 5 | Marriage/household mirror |
| 26 | **Truth delivery calibration** | `truth-delivery.js` | 4 | 4 | 3 | 4 | 5 | Personalized honesty |
| 27 | **Lumin epistemic contract (§2.6)** | `lifeos-lumin.js` | 4 | 3 | 4 | 4 | 5 | User-facing honesty |
| 28 | **Contradiction quarantine** | `memory-contradiction.js` | 4 | 4 | 4 | 5 | 3 | Prevents silent merge |
| 29 | **Memory zombie quarantine** | `memory-zombie.js` | 4 | 4 | 4 | 4 | 2 | Expired capsule hygiene |
| 30 | **Temporal Adversary council role** | `temporal_adversary.js` | 4 | 5 | 3 | 5 | 3 | Slow-failure lens |
| 31 | **Founder Decision Ledger** | `decision-ledger.js` | 4 | 4 | 4 | 4 | 3 | Control-plane memory |
| 32 | **Builder replay baselines + rollback_path** | `builder-truth-surface.js` | 4 | 4 | 4 | 4 | 2 | Operational undo |
| 33 | **Prediction loop S5** | AM36, `prediction-loop.mjs` | 4 | 4 | 4 | 5 | 2 | Calibrate autonomy |
| 34 | **Agent performance / routing** | AM39 `agent_performance` | 4 | 3 | 3 | 5 | 2 | Model truth over time |
| 35 | **Institutional memory digest** | `INSTITUTIONAL_MEMORY_DIGEST.md` | 4 | 3 | 4 | 4 | 2 | Extracted repair wisdom |
| 36 | **Gate-change THINK/GUESS labeling** | `lifeos-gate-change-proposals.js` | 4 | 3 | 5 | 4 | 2 | Hypothesis discipline |
| 37 | **KNOW/THINK/GUESS agent contract** | `00-LIFEOS-AGENT-CONTRACT.md` | 5 | 3 | 4 | 4 | 3 | Universal epistemic hygiene |
| 38 | **Working memory + replay** | `memory-working.js` | 4 | 4 | 4 | 3 | 3 | Conscious layer — orphan |
| 39 | **Capsule truth classes (10 types)** | `memory-truth-classes.js` | 4 | 4 | 4 | 4 | 3 | relationship vs objective vs document |
| 40 | **Conversation store + import pipelines** | `conversation-store.js`, imports | 4 | 2 | 3 | 3 | 4 | Archaeology input |
| 41 | **Idea vault / Lumin-Memory dumps** | AM38, inbox raw | 3 | 3 | 2 | 2 | 4 | Brainstorm preservation |
| 42 | **Micro/LCTP context compression** | `MicroProtocol.js`, git history | 4 | 4 | 3 | 2 | 3 | Scale conscious pack |
| 43 | **Response variety / anti-formulaic** | `response-variety.js` | 3 | 4 | 2 | 3 | 5 | Partial wiring |
| 44 | **Communication profile (adaptive)** | `communication-profile.js` | 3 | 4 | 2 | 3 | 5 | Personal voice memory |
| 45 | **Personal idiom layer** | AM21 backlog | 4 | 5 | 2 | 3 | 5 | Not built |
| 46 | **Emotional Wealth Engine** | AM21 | 4 | 5 | 2 | 3 | 5 | Backlog |
| 47 | **Factory historian JSONL** | `factory-staging/` | 3 | 3 | 4 | 3 | 1 | Mission step memory |
| 48 | **Drift Sentinel (council)** | `DRIFT_SENTINEL.md` | 3 | 3 | 5 | 4 | 1 | Local-only |
| 49 | **Memory healing (therapeutic)** | `memory-healing.js` | 3 | 3 | 1 | 2 | 5 | Different "memory" word |
| 50 | **Legacy memories.json CRUD** | `core/memory-system.js` | 2 | 1 | 1 | 1 | 2 | **Retire** — kept for rank visibility |

*L=long-term value, U=uniqueness, D=drift reduction, T=truth detection, O=user outcomes*

---

## K. Cross-reference index

| Document | Purpose |
|----------|---------|
| [`TRUTH_SYSTEM_ARCHITECTURE.md`](TRUTH_SYSTEM_ARCHITECTURE.md) | Evidence → Confidence → Truth → Law; gaps |
| [`PERSONAL_MEMORY_ARCHITECTURE.md`](PERSONAL_MEMORY_ARCHITECTURE.md) | User, relationship, coaching, growth |
| [`MEMORY_AUTHORITY_MAP.md`](MEMORY_AUTHORITY_MAP.md) | Ratified authority (production) |
| [`MEMORY_FRAMEWORK_DESIGN_BRIEF.md`](../MEMORY_FRAMEWORK_DESIGN_BRIEF.md) | Design bible |
| [`BUILDEROS_VOCABULARY.md`](../BUILDEROS_VOCABULARY.md) | Terminology law |

---

## L. Archaeology verdict

**What survived:** Amendment 39 evidence engine, capsule governance layer, authority map, proof contract, OIL truth surfaces, self-repair bridge, product conversation evidence doctrine, integrity/truth-delivery product lanes.

**What failed:** Single unified memory under one amendment; `conversation_memory` as canonical; repair-log-as-proof; writable `memories.json` as SSOT; factory historian stubs masquerading as prediction memory.

**What was forgotten:** Conscious pack, decay automation, working memory API, universal devil's advocate gate, Victory Vault, relationship integrity accounting, Micro/LCTP at council scale, FPM1 durability.

**What should be carried forward:** Treat **Evidence → Confidence → Truth → Law** as the organizing spine; memory surfaces are **preservation and retrieval mechanisms** indexed by authority class — not interchangeable buckets.

**No new architecture proposed in this document.**
