<!-- SYNOPSIS: Truth System Architecture -->

# Truth System Architecture

> **Governance supersession (2026-06-09):** Vocabulary + judgment chain sealed **`docs/BUILDEROS_VOCABULARY.md` v2.7**. Truth spine below unchanged and ratified in v2.7.

**Agent role:** Historian / Architecture Archaeologist  
**Mission date:** 2026-05-24  
**Companion:** [`MEMORY_ARCHITECTURE_ARCHAEOLOGY.md`](MEMORY_ARCHITECTURE_ARCHAEOLOGY.md)  
**Status:** Archaeology only — **no new architecture proposed**

---

## Executive thesis (founder-aligned)

The project's deepest architecture is likely **not** "memory" as the organizing noun. It is:

```text
Evidence → Confidence → Truth → Law
```

**Memory** is the **preservation and retrieval mechanism** for evidence and the audit trail of how confidence changed. Searching only for `memory`, `historian`, and `capsule` misses half the system — which lives under **proof**, **trust**, **confidence**, **prediction**, **outcome**, **receipt**, and **provenance**.

This document maps where each stage exists, where gaps remain, and how the two intentional "truth ladders" relate.

---

## 1. The two ladders (never merge)

The repo **explicitly forbids** collapsing these into one table or one vocabulary.

### 1A. Evidence Ladder (empirical — earned by trials)

| Level | Label | What earns it | Primary location |
|-------|-------|---------------|------------------|
| 0 | CLAIM | Stated, no evidence | `epistemic_facts.level`, AM39 |
| 1 | HYPOTHESIS | Rationale, not tested | AM39 |
| 2 | TESTED | Verifier survived | AM39, MEMORY_PROOF_CONTRACT |
| 3 | RECEIPT | Evidence committed, path cited | `fact_evidence`, OIL receipts |
| 4 | VERIFIED | Multiple independent confirmations | AM39 promotion rules |
| 5 | FACT | High hit rate across conditions | AM39 |
| 6 | INVARIANT | Zero exceptions across adversarial challenges | AM39 + devil's advocate gate |

**Code:** `services/memory-intelligence-service.js`  
**Schema:** `epistemic_facts`, `fact_evidence`, `fact_level_history`  
**Design:** `docs/MEMORY_FRAMEWORK_DESIGN_BRIEF.md` §3  
**Law:** `docs/products/memory-intelligence/PRODUCT_HOME.md`

**Promotion inputs:** trial count, adversarial trial count, source diversity, exception count, decay rate.

### 1B. Governance Ladder (constitutional — ratified by process)

| Level | Label | Meaning | Primary location |
|-------|-------|---------|------------------|
| 0 | Observation | Fact observed, no conclusion | NSSOT §2.0B |
| 1 | Hypothesis | Plausible, not proven | NSSOT §2.0B |
| 2 | Pattern | Repeated evidence, cautious action | NSSOT §2.0B |
| 3 | Proven Practice | Repeatedly improves outcomes | NSSOT §2.0B |
| 4 | Law | Strong evidence, survived challenge | NSSOT §2.0B |
| 5 | Foundational Law | Deeply validated system identity | NSSOT §2.0B |

**Storage:** Markdown amendments + Change Receipts — **not DB-promoted by trial count**  
**Law:** `docs/constitution/NORTH_STAR_SSOT.md` §2.0A–C  
**Challenge requirements:** origin, evidence, proof/failure conditions, review cadence, promotion/demotion/retirement criteria

**Critical rule (KNOW):** A fact at INVARIANT **cannot** auto-promote to constitutional LAW. Article VII amends law — not evidence volume.

---

## 2. Evidence → Confidence → Truth → Law chain

### Stage map

```text
┌─────────────────────────────────────────────────────────────────┐
│                        RAW OBSERVATIONS                          │
│  CI output · verifiers · user speech · commits · council debate   │
│  repair logs · conversation transcripts · operator receipts       │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         EVIDENCE                                 │
│  fact_evidence · memory_use_receipts · security_receipts        │
│  Change Receipts (md) · builder_task_receipts · OIL receipts     │
│  debate_records · adversarial_quality                           │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CONFIDENCE                                 │
│  epistemic_facts.level (0–6) · source_count · exception_count   │
│  capsule trust_level (PROPOSED→TRUSTED) via memory-trust-bridge │
│  factory trust: observed→trusted · legacy confidence 0–1        │
│  KNOW/THINK/GUESS/DON'T KNOW (agent contract)                   │
│  agent_performance.accuracy · proof_freshness reports             │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              TRUTH (operational — context-scoped)                │
│  epistemic_facts with scope (context_required, false_when)      │
│  governed capsule retrieval · routing recommendations           │
│  builder_truth_surfaces · OIL dispatch gates                      │
│  truth_delivery calibration · integrity scores                  │
│  "Evidence Before Interpretation" product layer                 │
└────────────────────────────┬────────────────────────────────────┘
                             ╳  (must NOT auto-cross)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAW (governance — ratified)                   │
│  SSOT_NORTH_STAR · SSOT_COMPANION · AMENDMENT_*                 │
│  BUILDEROS_VOCABULARY · gate-change APPROVE/REJECT              │
│  BPB blueprint authority · mission state machine                │
└─────────────────────────────────────────────────────────────────┘
```

### Per-stage inventory

#### EVIDENCE — where it exists

| Source type | Store / artifact | Wired? | Gap |
|-------------|------------------|--------|-----|
| CI / verifier output | `fact_evidence` via `addEvidence()` | Partial | Auto-wire from all verifiers backlog |
| Capsule use | `memory_use_receipts` | Yes | Not unified with fact_evidence ingest |
| Builder execution | `builder_task_receipts`, OIL JSONL | Yes | Factory vs production split |
| Security / deploy | `security_receipts` | Yes | — |
| Self-repair | `self_repair_memory_events` → epistemic bridge | Yes | Must not count as proof alone |
| SSOT changes | Change Receipts tables in amendments | Yes | Not queryable as epistemic_facts |
| Council debates | `debate_records` | Partial | Not universal on disagreements |
| Conversation raw | Interaction Evidence Engine spec | Partial | Interpretation separation not universal |
| Operator actions | `founder_decision_ledger.evidence_links` | Partial | Narrow consumer set |
| Prediction claims | `agent_performance`, prediction-loop | Partial | Factory stubs don't persist |
| Legacy | `data/memories.json` | Yes (legacy) | Should not feed proof |

#### CONFIDENCE — where it exists

| Mechanism | Location | Notes |
|-----------|----------|-------|
| Epistemic level 0–6 | `memory-intelligence-service.js` | Canonical for BuilderOS proof |
| Capsule trust tiers | `memory-trust-bridge.js` | Maps to evidence floor |
| Factory trust 5-level | `memory-trust-levels.md` | Doc only in factory |
| Legacy confidence 0–1 | `core/memory-system.js` | Parallel schema |
| Governance truth level 0–5 | NSSOT §2.0B | Separate ladder |
| Agent epistemic labels | `00-LIFEOS-AGENT-CONTRACT.md` | Prompt contract |
| Gate-change hypothesis labels | `lifeos-gate-change-proposals.js` | THINK/GUESS required |
| Model routing confidence | `getRoutingRecommendation`, `agent_performance` | Partial |
| Proof freshness score | `oil-proof-freshness.js` | Builder operational |
| Integrity score | `integrity-engine.js` | Personal behavioral confidence |

**Gap:** No single **confidence registry** across ladders — bridges exist capsule↔epistemic only.

#### TRUTH (operational) — where it exists

| Surface | Mechanism | Gap |
|---------|-----------|-----|
| Governed fact retrieval | `queryFacts`, capsule `retrieve` | Under-populated DB |
| Scope enforcement | `context_required`, `false_when` on facts | Must be enforced on every write |
| Action authority | `agent_task_authority`, trust bridge | Partial enforcement |
| Builder dispatch truth | `builder-truth-surface.js` | Production |
| Product truth delivery | `truth-delivery.js` | Lumin path only for variety |
| Interpretation separation | Conversation Evidence SSOT | Doc > code |
| Stale hypothesis detection | `stale_hypotheses` view | No decay worker |
| Contradiction handling | `contradiction_records` | Capsule path |

#### LAW — where it exists

| Surface | Mechanism |
|---------|-----------|
| Constitution | `SSOT_NORTH_STAR.md` |
| Operations | `SSOT_COMPANION.md` |
| Domain law | 48+ `AMENDMENT_*.md` files |
| Vocabulary law | `BUILDEROS_VOCABULARY.md`, AM48 |
| Blueprint law | BPB determinism §2.0E |
| Promotion to law | Article VII process — human/council ratification |
| Gate-change | `POST .../gate-change/run-preset`, council debate |

**Gap (correct):** Law is intentionally **not** in `epistemic_facts`. Gap is **operators treating sparse epistemic tables as "system knows truth"** when law docs are the governance source.

---

## 3. Concept inventory: Evidence, Facts, Knowledge, Decisions, Lessons, Wisdom

### Evidence

| Exists | Location |
|--------|----------|
| **Code** | `fact_evidence`, `memory_use_receipts`, OIL receipts, `recordEvidence`-style paths in MI service |
| **Doc** | Design brief §3, AM39, Conversation Evidence SSOT, MEMORY_PROOF_CONTRACT |
| **Gap** | Universal auto-ingest from CI/verifiers; conversation raw vs interpretation split in all product paths |

### Facts

| Exists | Location |
|--------|----------|
| **Code** | `epistemic_facts`, capsule-linked `fact_id`, legacy JSON memories |
| **Doc** | Evidence ladder, scope rules, truth classes |
| **Gap** | Production row count often WIRED/LIVE not PROVEN; seed pipeline thin |

### Knowledge

| Exists | Location |
|--------|----------|
| **Code** | `knowledge-context.js` (doc injection), `knowledge-base.js`, capsule retrieval |
| **Doc** | "Subconscious" store metaphor — design brief |
| **Gap** | Three read paths (legacy JSON, doc injection, epistemic query) not unified; **knowledge ≠ verified fact** often blurred |

### Decisions

| Exists | Location |
|--------|----------|
| **Code** | `decision-intelligence.js`, `decision-ledger.js`, `decision-intelligence` routes, factory `record-decision.js` (stub) |
| **Doc** | NSSOT mission state machine, AM36 handoff |
| **Gap** | Factory decision records don't persist; founder ledger narrow wiring |

### Lessons

| Exists | Location |
|--------|----------|
| **Code** | `lessons_learned`, self-repair bridge, FPM1 JSONL, institutional digest seed |
| **Doc** | AM39, INSTITUTIONAL_MEMORY_DIGEST, factory LESSONS_REGISTER |
| **Gap** | No single ingestion; FPM1 ephemeral |

### Wisdom

| Exists | Location |
|--------|----------|
| **Code** | Indirect — ROI view `lesson_retrieval_roi`, integrity coaching |
| **Doc** | Design brief §1 (institutional knowledge moat), AM21 Victory Vault / Failure museum |
| **Gap** | "Wisdom" not a first-class table — intentionally distributed across lessons + law + product mirrors |

---

## 4. Confidence, certainty, trust, verification, proof

### Confidence tracking

| System | What it measures | File |
|--------|------------------|------|
| Epistemic level | Evidence-weighted fact strength | `memory-intelligence-service.js` |
| Capsule trust | Product retrieval permission | `memory-trust-bridge.js` |
| Agent performance | Model accuracy over time | `agent_performance` table |
| Integrity score | Promise-keeping behavior | `integrity-engine.js` |
| Truth delivery log | Calibration outcomes | `truth-delivery.js` |
| Alpha readiness | Memory maturity phase | `builderos-system-alpha-readiness.js` |
| Supervised autonomy | Trust for builder autonomy | `supervised-autonomy-readiness.js` |

### Certainty / epistemic hygiene

| System | Location |
|--------|----------|
| KNOW/THINK/GUESS/DON'T KNOW | `prompts/00-LIFEOS-AGENT-CONTRACT.md`, Lumin contract |
| Hypothesis labeling on gate-change | `lifeos-gate-change-proposals.js` |
| §2.6 honesty (never mislead) | NSSOT, CLAUDE.md |
| Forbidden phrases / anti-formulaic | `response-variety.js` (partial wiring) |

### Trust levels

| Ladder | Levels | Scope |
|--------|--------|-------|
| Epistemic | 0–6 CLAIM→INVARIANT | BuilderOS proof |
| Capsule | PROPOSED→TRUSTED_FOR_CONTEXT | Product retrieval |
| Factory historian | observed→trusted | Factory JSONL doctrine |
| Legacy memory | confidence 0–1 | Retire |
| Governance | Observation→Foundational Law | Constitutional |

**Rule (factory doc):** "no silent trust promotion; no promotion without provenance; preserve record when trust suspended"

### Verification

| System | Location |
|--------|----------|
| CI verifiers | `scripts/verify-*.mjs`, tsos-compliance-officer |
| Memory CI evidence | `npm run memory:ci-evidence` |
| OIL audit before done | `builder-audit-before-done.js` |
| Sentry verify-step | `factory-staging/factory-core/sentry/` |
| Devil's advocate | Design brief, gate-change council, `builder-council-review.js` |
| BPB determinism | Multiple builders → equivalent output |

### Proof

| System | Location |
|--------|----------|
| MEMORY_PROOF_CONTRACT | epistemic_facts level≥2 + source_count>1 |
| Command center memory status | `/api/v1/lifeos/command-center/memory/status` |
| OIL security receipts | `oil-security-receipts.js` |
| Gemini proof routes | `routes/gemini-proof-routes.js` |
| Full receipt chain verifier | `scripts/verify-full-receipt-chain.mjs` |
| Builder truth surface | Dispatch DNA proof fields |

### Proof freshness

| System | Location |
|--------|----------|
| `oil-proof-freshness.js` | Staleness of deploy truth vs live |
| `buildProofFreshnessReport` | Command center integration |
| Factory sentry `proof-freshness.js` | Factory mirror |
| Design brief decay_rate | Schema; worker missing |

### Provenance

| System | Location |
|--------|----------|
| `memory-provenance.js` | Capsule chains + retrieval_events |
| `fact_evidence` | Per-fact evidence links |
| Change Receipts | SSOT file provenance |
| Factory record-decision | provenance field in stub shape |
| Git commits | deployment-service commitToGitHub |

### Accuracy tracking

| System | Location |
|--------|----------|
| `agent_performance` | AM39 |
| `getAgentsAccuracy` API | memory-intelligence routes |
| Prediction loop validation | `scripts/validate-predictions.mjs` |
| Model performance chain | repair phase 2 migration |
| Outcome tracker ROI | twin routes |

---

## 5. Prediction tracking & outcome tracking

### Prediction

| Implementation | Status | Location |
|----------------|--------|----------|
| AM39 agent_performance | Code + tables | MI service |
| Prediction loop S5 | Partial | `scripts/lib/prediction-loop.mjs`, AM36 |
| Factory record-prediction | **Stub only** | Returns object, no persist |
| ML prediction services | Orphan domain | `services/ml-prediction/` |
| Design brief | "Without prediction, there is memory" | Doctrine |

### Outcome

| Implementation | Status | Location |
|----------------|--------|----------|
| AM39 lessons + performance | Code | MI service |
| Outcome tracker | Production (twin) | `outcome-tracker.js` |
| Factory record-outcome | **Stub only** | factory historian |
| Build outcomes table | Production | `build_outcomes` |
| Self-repair execution outcomes | Production | executor chain |
| Mission state "Outcome Measured" | Doc | NSSOT §2.0D |

**Gap:** Factory historian **spec promises** prediction/outcome/lesson/decision memory; **stubs don't write**. AM39 has real tables but **thin data**. Prediction-outcome loop is the highest-value unfinished spine.

---

## 6. Truth decay, review triggers, assumption challenges

### Truth decay

| Element | Status |
|---------|--------|
| `decay_rate` column on facts | Schema exists |
| `stale_hypotheses` view | Exists |
| Scheduled decay worker | **Not found** — backlog |
| Code churn → decay | Design brief — doc only |
| Capsule `review_by` + zombie quarantine | Partial in `memory-zombie.js` |

### Review triggers

| Trigger | Location |
|---------|----------|
| NSSOT §2.0C review cadence on laws | Constitutional requirement |
| Gate-change presets | maturity, program-start |
| AM36 zero-drift handoff | Cold-start protocol |
| Stale hypothesis query | MI API |
| Proof freshness report | OIL |
| Integrity weekly coaching | scheduled job |
| Truth delivery calibration | scheduled in lifeos-scheduled-jobs |
| Exception_count demotion | MI promotion logic |

### Assumption challenges

| Mechanism | Location |
|-----------|----------|
| Devil's Advocate gate (TESTED→VERIFIED) | Design brief, AM39 debates |
| Temporal Adversary | `council/roles/temporal_adversary.js` |
| Gate-change council | THINK/GUESS required hypotheses |
| Steelman / devilsAdvocate mode | `builder-council-review.js` |
| Communication OS devils_advocate lens | `lifeos-communication-os-service.js` |
| Law challenge requirement | NSSOT §2.0C |
| Contradiction engine belief archaeology | `contradiction-engine.js` |

**Gap:** Assumption challenge is **strong in doctrine**, **partial in runtime** — not on every promotion or every council call.

---

## 7. Knowledge promotion & demotion

### Epistemic (code)

| Action | Function | Rules |
|--------|----------|-------|
| Promote | `promoteFact`, `addEvidence` auto rules | Trial count, adversarial count, sources |
| Demote | `demoteFact` | Exception triggers immediate demotion |
| History | `fact_level_history` | Audit trail |

### Governance (process)

| Action | Mechanism |
|--------|-----------|
| Promote to law | Article VII, gate-change, council consensus |
| Demote law | Amendment revision + receipt |
| Retire | NSSOT §2.0C retirement criteria |

### Capsule (code)

| Action | Function |
|--------|----------|
| Trust update | `updateCapsuleTrust` |
| Quarantine | zombie + contradiction paths |
| Correction | `POST /capsules/correct` |

**Name collision warning:** `core/promotion-engine.js` is **marketing self-promotion** — not epistemic promotion. Permanent retirement from epistemic docs recommended.

---

## 8. Audit trails & receipts (truth preservation layer)

| Receipt type | Store | Role in chain |
|--------------|-------|---------------|
| fact_evidence | Neon | Evidence → confidence |
| fact_level_history | Neon | Confidence changes |
| memory_use_receipts | Neon | What influenced retrieval |
| security_receipts | Neon | Deploy/security proof |
| builder_task_receipts | Neon | Build execution proof |
| Change Receipts | Amendment markdown | Law evolution |
| self-repair JSONL | File | Repair lesson input |
| historian JSONL | File | Factory step history |
| response_variety_log | Neon | Voice anti-formulaic audit |
| truth_delivery_log | Neon | Product calibration audit |
| intent_drift_events | Neon | Ask vs deliver audit |

**Insight:** Receipts **are** the memory mechanism for the Evidence→Confidence stage. Calling them "just logs" understates their architectural role.

---

## 9. Gap summary (archaeology verdict)

| Gap | Severity | Evidence |
|-----|----------|----------|
| Epistemic tables under-populated | High | MEMORY_PROOF_CONTRACT honest WIRED/LIVE |
| Factory historian stubs vs AM39 spec | High | record-* don't persist |
| Three trust ladders without unified registry | Medium | Authority map partial bridge |
| Truth decay worker missing | Medium | Column only |
| Universal devil's advocate gate | Medium | Schema yes, enforcement sparse |
| Legacy JSON still feeds council | Medium | knowledge-context import |
| Conversation evidence doc > code | Medium | Interpretation separation |
| Prediction-outcome loop incomplete | High | AM36 partial, factory stubs |
| Law vs evidence conflation by agents | High | Recurring archaeology finding |
| Anti-formulaic / epistemic contract not system-wide | Medium | Lumin only for variety |

---

## 10. What already exists vs what failed

### Exists and should carry forward

- Two-ladder doctrine (evidence vs governance)
- Amendment 39 evidence engine (code + schema)
- Memory Proof Contract (honest scoring)
- OIL proof freshness + security receipts
- Capsule provenance + trust bridge
- Self-repair → epistemic bridge
- Evidence Before Interpretation (product doctrine)
- KNOW/THINK/GUESS contract
- Intent drift as memory event
- NSSOT law challenge requirements

### Failed or should retire

- Single memory umbrella
- Repair log as proof
- Writable memories.json as authority
- Factory stubs counted as "historian memory"
- Marketing promotion-engine as epistemic naming
- conversation_memory as canonical narrative

### Forgotten but high-value

- Evidence → Confidence → Truth → Law as **explicit spine** (now documented)
- Decay automation
- Universal conscious pack
- Full prediction-outcome calibration loop
- Mandatory adversarial promotion gate

---

## 11. Cross-references

| Document | Role |
|----------|------|
| [`MEMORY_ARCHITECTURE_ARCHAEOLOGY.md`](MEMORY_ARCHITECTURE_ARCHAEOLOGY.md) | All memory surfaces + Top 50 |
| [`PERSONAL_MEMORY_ARCHITECTURE.md`](PERSONAL_MEMORY_ARCHITECTURE.md) | User/relationship/coaching truth |
| [`MEMORY_AUTHORITY_MAP.md`](MEMORY_AUTHORITY_MAP.md) | Ratified authority |
| [`MEMORY_FRAMEWORK_DESIGN_BRIEF.md`](../MEMORY_FRAMEWORK_DESIGN_BRIEF.md) | Design bible |
| [`MEMORY_PROOF_CONTRACT.md`](../projects/builderos-remediation/MEMORY_PROOF_CONTRACT.md) | BuilderOS proof rules |
| [`LIFEOS_CONVERSATION_EVIDENCE_SSOT.md`](../LIFEOS_CONVERSATION_EVIDENCE_SSOT.md) | Product evidence doctrine |

**No new architecture proposed in this document.**
