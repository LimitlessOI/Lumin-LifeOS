<!-- SYNOPSIS: Canonical product home — Memory Intelligence -->

# Memory Intelligence Product Home

**Formerly called:** Amendment 39 — MEMORY INTELLIGENCE

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `memory-intelligence` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/memory-intelligence/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-07-19 — Cognitive Core Era-4 Trust Me (+ Era-3 Extend Me ship) |

---
**Status:** Active — Phase 1 Complete + Governance Hardening + Builder Integration  
**Priority:** High  
**Owner:** Adam  
**Last Updated:** 2026-06-28
**Stability:** Stable (Phase 1 + builder sync complete; Phases 2–4 in backlog)

---

## Mission

Replace the file-as-fact model with an **evidence engine**: every stored fact carries its own confidence history, source diversity, decay rate, and scope — and the system's behavior is proportional to that proof.

**Governing design question for every retrieval:**
> Not "what do we know?" but "what has earned the right to influence action, at what weight, in this context?"

This is not a second brain that contradicts the SSOT. It is the SSOT becoming self-aware about how confident it should be in itself.

### Constitutional alignment update

Memory does not exist to make the system feel informed.
It exists to calibrate what has earned the right to influence action.

Historian-level memory must record:
- decision
- reason
- prediction
- outcome
- lesson

Without prediction, there is memory.
With prediction and outcome comparison, there is calibration and learning.

---

## The Two Ladders — Critical Distinction

### Evidence Ladder (this system)
Empirical facts earned through trials. Tops out at INVARIANT.

| Level | Label | What earns it |
|---|---|---|
| 0 | CLAIM | Someone stated it — no evidence |
| 1 | HYPOTHESIS | Has a rationale, not yet tested |
| 2 | TESTED | Ran a real verifier and survived |
| 3 | RECEIPT | Evidence committed, path cited |
| 4 | VERIFIED | Multiple independent agents/sessions confirmed |
| 5 | FACT | High hit rate across varied conditions |
| 6 | INVARIANT | 100/100 across adversarial challenges, zero exceptions, multiple independent sources |

### Governance Ladder (NSSOT — separate, not this system)
Ratified by process. Constitutional Article → Ratified Amendment → Operational Rule → Working Guideline.

**These two ladders never cross.** A fact cannot auto-promote to constitutional authority no matter how many times it proves true. INVARIANT ≠ LAW. LAW is the governance ladder word. Using LAW for empirical facts would corrupt the constitutional vocabulary.

---

## Scope and Conditions

Every fact is conditionally true, not universally true. Fields:
- `context_required` — "Railway production", "Neon prod DB", "local shell with exports"
- `false_when` — conditions under which this fact does not hold

Without scope, a fact can be technically correct and operationally misleading simultaneously. This is the root cause of the GITHUB_TOKEN false claim incident.

---

## Residue Risk

When a council reaches consensus, the minority view is not discarded. It is stored as:
```json
{ "argument": "...", "confidence": 0.4, "conditions_that_would_reopen": "..." }
```
Unresolved uncertainty survives consensus. It waits.

---

## Disproof Recipe

Important facts carry a `disproof_recipe` — the fastest known way to try to break the fact. Makes adversarial challenges systematic, not random.

---

## Cognitive Core Era-1 (Judgment Compiler)

**Laws:** `docs/constitution/COGNITIVE_CORE_LAWS.md`  
**Thesis:** Optimize the compiler that models the user (predict → miss → causal correction), not a static twin. Capsules are attention lenses; Decision Journal + Prediction Scoreboard are the engine; Chair wear UI is the steering wheel.

| Surface | Path |
|---|---|
| Health / capsules / scoreboard / journal | `/api/v1/cognitive-core/*` |
| Chair cutover | `services/lumin-chair-orchestrator.js` → `runCognitiveCoreJudgmentTurn` before build/counsel |
| Capsule contracts | `config/judgment-capsule-contracts.js` |
| Schema | `db/migrations/20260719_cognitive_core_judgment.sql` |

Am 39 `agent_performance` is fed on outcome scoring (`cognitive_core_compiler`). Domain trust tiers: refuse / ask / suggest / allow.

## Cognitive Core Era-2 (Improve Me)

**Thesis:** the system stops merely recording and starts improving Adam's thinking. Every miss now updates the *compiler* (Law 5), not just a note. Layer 2 (Programs) is live: deep recurring patterns modeled as **evolving hypotheses** (confidence + evidence + change trajectory — never truth, Law 1).

| Capability (idea #) | Surface | Behaviour |
|---|---|---|
| Programs layer (#3 as hypotheses) | `services/cognitive-core-programs.js`, `GET/POST /programs`, `PATCH /programs/:id` | Deep patterns w/ triggers, protective purpose, cost, confidence, evidence for/against, trajectory. Injected into every judgment prompt; predictions link to concrete program ids via activations. |
| Causal miss loop (Law 5) | `services/cognitive-core-improve.js` → `classifyMissAndCorrect`; auto-runs on outcome | On a miss: classify across the 5 failure classes, propose correction, **move program confidence on that evidence**, induce a new program hypothesis when `missing_program`. |
| Outcome capture | orchestrator `detectOutcomeTurn` → record outcome (`chair_confirm`) → miss loop → calibration reply | "I went with X" closes the loop from chat — explicit self-report only, never inferred. |
| Decision replay (#4) | `POST /decisions/:id/replay` | Re-run a past decision with today's programs; would_change + what_changed. |
| Counterfactual engine (#7) | `POST /decisions/:id/counterfactual` | 2nd/3rd-order effects of the road not taken (hedged hypotheses). |
| External minds + Future Self (#8, #10) | `config/cognitive-core-advisors.js`, `GET /advisors`, wear chips | Munger/Bezos/Jobs/Buffett/Feynman/Therapist/Operator/Future-You reasoning-style lenses. Each carries an explicit `simulation_note` — NOT the real person. |
| Relationship twins (#11) | `services/cognitive-core-improve.js`, `GET/POST /relationships` | Hypotheses about people Adam works with (comms style, values, triggers, what works). |
| Learning-style model (#12) | `GET/PUT /learning-style` | Modality hypotheses (visual/narrative/examples/debate…) with modest confidence. |

Model calls use the strong-model failover chain (`defaultPlannerCallModel`, SO-003 — never idle). All AI output is hypothesis; confidence is clamped and never fabricated.

## Cognitive Core Era-3 (Extend Me)

**Thesis:** proactive partner — notices patterns, predicts consequences, fills knowledge gaps before asked.

| Capability (idea #) | Surface | Behaviour |
|---|---|---|
| Energy & Performance (#13) | `GET /energy` | Decision-quality by part-of-day from journal hit rates; honest low confidence until n is real |
| Value Drift (#14) | `GET/POST /values`, `GET /values/drift` | Principles as hypotheses; drift events on outcome (not auto-punish) |
| Consequence Simulator (#15) | judgment turn + `POST /decisions/:id/consequences` | Prospective 2nd/3rd-order effects + watch signals |
| Missing Info (#16) | judgment turn + `POST /decisions/:id/missing-info` | Most valuable missing fact + cheapest way to learn |
| Idea Evolution Graph (#17) | `GET/POST /ideas`, `POST /ideas/link` | Nodes/edges (mutation/combination/contradiction/breakthrough) |
| Curiosity Engine (#18) | `GET/POST /curiosity` | Learning targets from misses + weak programs |

## Cognitive Core Era-4 (Trust Me)

**Thesis:** AI has earned enough evidence to handle **narrowly defined** decisions on Adam's behalf, keep him informed, allow override. Law 2 is non-negotiable — no autonomy from a flipped flag.

| Capability (idea #) | Surface | Behaviour |
|---|---|---|
| Expert Collaboration (#19) | `POST /trust/debate` | Structured multi-advisor debate; tension first, then synthesis |
| Memory Compression (#20) | `GET /trust/models`, `POST /trust/models/compress` | Distill decisions into high-level mental-model hypotheses |
| Legacy Recorder (#21) | `GET/POST /trust/legacy` | Principles / heuristics / stories / failures / lessons |
| Apprenticeship (#22) | `POST /trust/apprentice/:decisionId` | Teach the reasoning *process*, not just the conclusion |
| Delegation Confidence (#23) | `GET /trust/can-act`, `GET/POST /trust/scopes*` | Scoreboard → scopes; founder approve only when n≥5 and not refuse |
| Autonomous Advisor (#24) | `GET/POST /trust/actions`, override | Bounded proposals logged; refuse/ask/suggest/allow; always overridable |

## Owned Files

| File | Purpose |
|---|---|
| `db/migrations/20260426_memory_intelligence.sql` | Schema: all 7 tables + 2 views |
| `db/migrations/20260426_memory_intelligence_hardening.sql` | Source-count + future-lookback hardening |
| `db/migrations/20260426_memory_protocol_enforcement.sql` | Protocol violations + task authority |
| `db/migrations/20260719_cognitive_core_judgment.sql` | Judgment journal, predictions, outcomes, miss reports, domain trust |
| `db/migrations/20260719_cognitive_core_era2.sql` | Era-2: programs, program_activations, replays, counterfactuals, relationship_twins, learning_style |
| `db/migrations/20260719_cognitive_core_era3.sql` | Era-3: values, drift, consequences, missing_info, ideas, curiosity, energy |
| `db/migrations/20260719_cognitive_core_era4.sql` | Era-4: debates, mental_models, legacy, apprenticeship, delegation_scopes, autonomous_actions |
| `services/memory-intelligence-service.js` | Core evidence engine logic |
| `services/cognitive-core-judgment.js` | Decision journal + scoreboard |
| `services/cognitive-core-perspective.js` | Multi-wear tension + judgment turn (+ Era-2/3 proactivity) |
| `services/cognitive-core-programs.js` | Era-2 Programs layer (hypotheses, confidence/evidence, activations) |
| `services/cognitive-core-improve.js` | Era-2 Improve engine: miss loop, induction, replay, counterfactual, relationship/learning |
| `services/cognitive-core-extend.js` | Era-3 Extend engine |
| `services/cognitive-core-values.js` | Era-3 value drift store |
| `services/cognitive-core-ideas.js` | Era-3 idea evolution graph |
| `services/cognitive-core-trust.js` | Era-4 Trust Me engine |
| `config/judgment-capsule-contracts.js` | Perspective lens contracts (allow/deny) + outcome-turn detection |
| `config/cognitive-core-advisors.js` | Era-2 external-mind + future-self wearable lenses |
| `routes/memory-intelligence-routes.js` | API surface |
| `routes/cognitive-core-routes.js` | Cognitive Core API (Era-1–4) |
| `tests/cognitive-core-judgment.test.js` | Era-1 unit tests |
| `tests/cognitive-core-era2.test.js` | Era-2 unit tests |
| `tests/cognitive-core-era3.test.js` | Era-3 unit tests |
| `tests/cognitive-core-era4.test.js` | Era-4 Law-2 / trust unit tests |
| `docs/MEMORY_FRAMEWORK_DESIGN_BRIEF.md` | Full design brief (cross-model reviewed) |
| `docs/constitution/COGNITIVE_CORE_LAWS.md` | Five laws + meta-learning constitution |

---

## Database Tables

### `epistemic_facts`
Core fact store. Each fact carries: text, domain, level (0–6), context_required, false_when, disproof_recipe, trial_count, adversarial_count, exception_count, source_count, last_tested_at, decay_rate, review_by (for hypotheses), visibility_class, canonical_id (for dedup), residue_risk, created_by.

### `fact_evidence`
Every trial result. Fields: fact_id, event_type (confirmation|exception|adversarial|operator_override|ci_pass|ci_fail|replay), result (confirmed|failed|held|overridden|inconclusive), evidence_text, source, source_is_independent, adversarial_quality (0–5; 0=theater, 5=found real gap), override_reason.

### `fact_level_history`
Append-only level changes. Facts never silently change level. Fields: fact_id, from_level, to_level, reason, evidence_id, changed_by, changed_at.

### `retrieval_events`
Tracks every retrieval for cost-vs-value measurement. Fields: fact_id, retrieved_by, context, acted_on (boolean — did agent use this fact?).

### `debate_records`
Full debate structure — not just the outcome. Fields: subject, related_fact_id, initial_positions (JSONB), arguments (JSONB), what_moved_minds, consensus, consensus_method, lessons_learned, problem_class, residue_risk, future_lookback, council_run_id, duration_minutes.

### `lessons_learned`
Categorized lessons. Fields: domain, impact_class (small|medium|large|unknown), problem, solution, how_novel, surfaced_by, retrieval_count, write_cost_tokens (bogging-down metric), tags.

### `agent_performance`
Track record by task type — including operator "adam". Fields: agent_id, task_type, prediction, outcome (correct|incorrect|partial|overridden), confidence_at_time, notes.

### Founder Intent Model support

The memory system must support Founder Intent Model evaluation by recording, when available:
- founder instinct
- founder intent model prediction
- council recommendation
- consensus outcome
- measured outcome
- calibration notes on where founder instinct or model judgment was stronger or weaker

This does not make any one source automatically correct.
It makes them comparable through outcomes.

### `agent_protocol_violations`
Corner-cutting / misalignment memory. Fields: agent_id, task_type, violation_type, severity, details, evidence_text, detected_by, source_route, related_fact_id, related_debate_id, auto_action.

### `agent_task_authority`
Runtime permission to perform a class of work. Fields: agent_id, task_type, authority_status (allowed|watch|blocked), reason, notes, metadata, set_by, expires_at.

### `intent_drift_events`
§2.11b asked-vs-shipped as a memory event. Fields: asked, delivered, drift_reason, agent_id, related_fact_id, resolved.

---

## Database Views

### `lesson_retrieval_roi`
Surfaces lessons where write cost exceeds retrieval value (negative ROI). Used to prune low-value logging categories.

### `stale_hypotheses`
All HYPOTHESIS facts past their `review_by` date.

---

## API Routes (mounted at `/api/v1/memory/evidence`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | System summary: counts, invariants, open drifts |
| GET | `/facts` | Query facts (context, domain, minLevel, visibilityClass) |
| POST | `/facts` | Record new fact |
| GET | `/facts/:id` | Get single fact with metadata |
| POST | `/facts/:id/evidence` | Add evidence (may trigger auto promotion/demotion) |
| POST | `/facts/:id/promote` | Manually promote one level (INVARIANT requires adversarial gate) |
| POST | `/facts/:id/demote` | Demote immediately (any exception warrants this) |
| GET | `/debates` | Query debates by problem class |
| POST | `/debates` | Record full debate with positions, arguments, residue |
| GET | `/lessons` | Get lessons by domain |
| GET | `/lessons/roi` | ROI report — cost vs retrieval value |
| POST | `/lessons` | Record lesson |
| GET | `/agents/:id/accuracy` | Agent accuracy by task type (including "adam") |
| POST | `/agents/performance` | Record performance event |
| GET | `/agents/violations` | List protocol violations |
| POST | `/agents/violations` | Record protocol violation; may auto-demote authority |
| GET | `/agents/authority` | List active authority rows |
| GET | `/agents/:id/authority` | Current authority for task type |
| POST | `/agents/authority` | Set authority (allowed/watch/blocked) |
| POST | `/intent-drift` | Log §2.11b intent drift event |
| GET | `/routing/recommendation` | Best authorized model for a task type |
| GET | `/stale-hypotheses` | Hypotheses past review_by date |

---

## Promotion Rules

- **INVARIANT gate:** Requires `adversarial_count >= 3` AND `exception_count === 0`. Cannot be bypassed.
- **VERIFIED auto-promotion:** When `source_count >= 2` independent sources confirm a TESTED fact.
- **Exception auto-demotion:** Any `result = 'failed'` on a fact above TESTED → immediately steps back to TESTED.
- **Level history:** Every change appends a row to `fact_level_history`. No silent edits.

---

## Adversarial Quality Scoring

Devil's advocates that always "lose" add noise and corrupt the ladder. Every adversarial event carries an `adversarial_quality` score (0–5):
- 0 = trivial / theater (did not find real issue)
- 5 = found a genuine gap or exception

Low-quality adversarial trials are not counted toward the INVARIANT gate.

---

## Future-back Protocol

Every load-bearing debate must produce a **future_back** artifact:
- what worked two years later
- what broke down two years later
- what we wish we had known on day one
- what signals we should instrument now so the breakdown is visible early

This turns long-horizon regret into present-tense monitoring.

## Mission linkage requirement

Where runtime surfaces support it, debates, lessons, agent-performance events, and protocol violations should attach to `mission_id` or an equivalent mission reference.

Current truth:
- some memory records already preserve decision and outcome-adjacent context
- a full first-class mission object is still a constitutional target, not yet universal runtime reality

---

## Anti-Corner-Cutting Enforcement

- Model output is a claim, not proof.
- Protocol violations are first-class memory events.
- Repeated shortcutting, misleading certainty, skipped verification, or intent drift may reduce a model’s authority for the relevant task type.
- Static task routing is preference only; runtime authority and reliability can override it.

---

## Phase Build Order (Slow and Right)

### Phase 1 — Foundation (COMPLETE 2026-04-26)
- ✅ All 7 tables + 2 views
- ✅ Core service: record, query, promote, demote, evidence
- ✅ Full route surface (16+ endpoints)
- ✅ Mounted in startup/register-runtime-routes.js at `/api/v1/memory/evidence`
- ✅ Syntax verified
- ✅ `scripts/seed-epistemic-facts.mjs` — seeds from SSOT receipts + ENV_REGISTRY + architectural invariants (`npm run memory:seed`)
- ✅ `scripts/record-ci-evidence.mjs` — records `node --check` outcomes as `fact_evidence` rows; auto-promotes to TESTED after 3 passes (`npm run memory:ci-evidence`)
- ✅ Builder syntax gate in `/build` — node --check before every JS commit; 422 + protocol violation on failure
- ✅ Builder `/history` endpoint — exposes `conductor_builder_audit` trail (`GET /api/v1/lifeos/builder/history`)
- ✅ `prompts/lifeos-memory-intelligence.md` — domain context for builder targeting
- ✅ `prompts/lifeos-platform.md` — platform infrastructure domain context
- ✅ `scripts/council-builder-preflight.mjs` — GITHUB_TOKEN false claim fixed (now non-fatal ENV_DIAGNOSIS_PROTOCOL guidance)
- ✅ `docs/AGENT_RULES.compact.md` — regenerated with memory + anti-corner-cutting section

### Phase 2 — Adoption (next)
- Seed initial facts from existing SSOT receipts (high-confidence operational facts)
- Wire `ci_pass` evidence events from smoke-test runner
- Wire `operator_override` events from CLAUDE.md session protocol
- Add `disproof_recipe` to all INVARIANT-candidate facts

### Phase 3 — Agent routing
- Surface `getAgentAccuracy` in Command Center dashboard
- Extend runtime task-to-agent routing beyond builder / gate-change / Lumin to all AI lanes
- Begin tracking Adam's override decisions as `operator_override` evidence events

### Phase 4 — Temporal + graph
- Decay automation (confidence drops with code churn rate)
- Replay harness: snapshot conscious pack at council decision → re-run later → measure drift
- Blast radius graph: what amendments/routes depend on a given fact

---

## Anti-Drift Notes

- Level 6 is INVARIANT — never call it LAW. LAW = governance ladder = NSSOT ratification process.
- Debate records are separate from facts. Debates inform facts; they are not facts.
- Builder/CI output is CLAIM or RECEIPT by default. CI passing = promotion event to TESTED, not automatic FACT.
- Nightly consolidation jobs MUST use `createUsefulWorkGuard()` (Zero-Waste rule).
- The two products (operator institutional memory vs LifeOS user epistemics) may share the philosophy but use different tables and tenancy in Phase 3+.

---

## Agent Handoff Notes

**Current state (2026-05-14, S2 complete):**
Phase 1 fully built + extended. Phase 2 adoption (S2) now seeded:
- All 7 tables + 2 views auto-apply on deploy
- `epistemic_facts`: 3678 rows (seeded 2026-04-26 from SSOT receipts + ENV_REGISTRY + architectural invariants)
- `lessons_learned`: **10 rows** (seeded 2026-05-14, S2 — real repair-loop lessons from AM36/CONTINUITY_LOG)
- `npm run memory:seed` — seeds epistemic_facts (SSOT sources)
- `npm run memory:seed-lessons` — seeds lessons_learned (repair-loop receipts); also writes `docs/INSTITUTIONAL_MEMORY_DIGEST.md`
- `npm run memory:ci-evidence` — records node --check results as fact_evidence
- `docs/INSTITUTIONAL_MEMORY_DIGEST.md` — committed static digest generated from lessons_learned DB rows
- `docs/AI_COLD_START.md` — now includes an "Institutional Memory" section with top lessons (reader confirmed)
- Builder `/build` has pre-commit syntax gate; `/history` surfaces conductor_builder_audit trail
- Domain prompt files: `prompts/lifeos-memory-intelligence.md`, `prompts/lifeos-platform.md`

**Next priority (in order):**
1. **Wire `memory:ci-evidence` into `.github/workflows/smoke-test.yml`** — auto-record CI results as evidence
2. **Regenerate digest on lesson updates** — add `memory:seed-lessons` to CI or a post-seed hook so INSTITUTIONAL_MEMORY_DIGEST.md stays current
3. **S3: C09 Build Closure Contract** — per Phase 2 agreed sequence: C21 ✅ → C02 ✅ → C09 next
4. **Add SQL validation gate** — validate `.sql` files before builder commits them
5. **Add HTML validation gate** — basic structure check for `.html` files

**What NOT to do:**
- Do not merge the evidence ladder with the governance ladder
- Do not auto-promote anything to INVARIANT without the adversarial gate passing
- Do not create a second memory system — this IS the memory system

---

## Change Receipts

| Date | File | What | Why |
|---|---|---|---|
| 2026-07-19 | Cognitive Core Era-3 + Era-4 | Extend Me (#13–18) + Trust Me (#19–24): migrations era3/era4, `cognitive-core-extend/values/ideas/trust.js`, routes + Law-2 can-act/scopes/actions/debate/legacy/apprentice, tests era3+era4, health `era: 4`, Chair meta lines. | Adam: "go to ev4" — finish Extend Me gate then Trust Me band (earned delegation, inform + override). |
| 2026-07-19 | Cognitive Core Era-2 | Programs layer (hypotheses) + `program_activations`; causal miss loop auto-runs on outcome (classify→correct→move program confidence→induce); outcome capture from chat (`detectOutcomeTurn`); decision replay + counterfactual engine; external-mind + future-self advisor lenses; relationship twins; learning-style model. Migration `20260719_cognitive_core_era2.sql`; services `cognitive-core-programs.js` + `cognitive-core-improve.js`; routes extended; `cognitive-core-era2.test.js` wired to CI. | Adam: "finish all of Era 2 before we audit it with CC" — Improve Me era: system improves the compiler on every miss, wears external minds, models people + learning style. Direct-author + independent-audit path (Adam-ratified for this thread). |
| 2026-07-19 | Cognitive Core Era-1 | Laws doc + judgment schema/services/routes; Chair perspective→conflict→predict→journal; lifeos-app wear chips; decision turns no longer misroute to build via `should I … or …` | Adam: judgment compiler moat — Decision Journal engine + Capsule UI; meta-learning over twin cosplay |
| 2026-06-28 | `services/self-repair-memory.js` + `services/reality-ledger.js` | Repair memory append path now mirrors each event into the append-only Reality Ledger (owner + expected/actual outcomes). | V1-00 Five Recorders: unrecoverable history must start before the loop is fully closed. |
| 2026-06-28 | `services/self-repair-memory.js` | Self-repair memory events now persist `attempt_stages[]` and `context_requirements_seen[]` derived from executed repair steps, so memory records whether lessons/research/consensus were actually required in the run that produced the lesson. | BuilderOS closure work needed memory to track not just that a repair happened, but what escalation/carry-forward context shaped that lesson. |
| 2026-06-24 | `services/truth-scoreboard-worker.js` + `config/truth-governance-hypotheses.json` | Closed-loop scoreboard: parity/verify receipts → `addEvidence` → promote/demote `epistemic_facts`; twin drift ingest; scheduled tick on boot | Adam: truth level from results not fancy — GUESS watched until reality promotes |
| 2026-06-01 | Governance-only constitutional alignment | Added historian prediction→outcome wording, Founder Intent Model support fields, and mission-linkage requirement language that is explicit about current runtime limits. | Align evidence memory with trust-calibrated governance without claiming full mission-object enforcement exists already. |
| 2026-05-24 | `services/self-repair-memory.js` | Phase 2+3 hardening: `writeRepairMemoryFromExecution` now writes to `self_repair_memory_events` table first (DB-first), reports `{db_written, jsonl_written, fallback_used}`; back-fills `fact_id` FK. Added `readRepairMemoryFromDedicatedTable(pool, limit)` — queries `self_repair_memory_events` with all named columns, `source='db'`. `readLatestRepairMemory` priority: JSONL → DB (self_repair_memory_events) → epistemic_facts. | Durable per-field schema for self-repair memory — prior state stored lessons as JSON blob in epistemic_facts.context_required with no queryable fields |
| 2026-05-24 | `services/self-repair-memory.js` | Added `classifyRepairLesson` on write (classification, signals, verification_path); `enrichLessonsWithClassification` on read via `self-repair-lesson-classifier.js` — lessons remain derived from executor only, no invented prevention text | Adam slice: self-repair memory → prevention; classification attached to JSONL + epistemic_facts context |
| 2026-04-26 | `db/migrations/20260426_memory_intelligence.sql` | Created — 7 tables, 2 views, full Phase 1 schema | Memory Intelligence Phase 1 foundation |
| 2026-04-26 | `services/memory-intelligence-service.js` | Created — full evidence engine: recordFact, addEvidence, promoteFact, demoteFact, recordDebate, recordLesson, recordAgentPerformance, recordIntentDrift | Core business logic for epistemic fact store |
| 2026-04-26 | `routes/memory-intelligence-routes.js` | Created — facts, debates, lessons, routing, authority, protocol-violation, intent-drift endpoints | API surface for the evidence engine |
| 2026-04-26 | `startup/register-runtime-routes.js` | Added import + mount at `/api/v1/memory` | Wire routes into running app |
| 2026-04-26 | `docs/MEMORY_FRAMEWORK_DESIGN_BRIEF.md` | Fixed LAW → INVARIANT; added two-ladder system; added design sentence; added residue risk + disproof recipe; corrected amendment number reference | Cross-model review resulted in vocabulary correction; brief is now build-ready |
| 2026-04-26 | `db/migrations/20260426_memory_intelligence_hardening.sql` | Added future-lookback storage + source-count hardening | Keeps evidence counters truthful and stores consensus durability scans |
| 2026-04-26 | `db/migrations/20260426_memory_protocol_enforcement.sql` | Added protocol violations + task authority tables | Corner-cutting must become visible and enforceable, not just discouraged |
| 2026-04-26 | `services/memory-intelligence-service.js` / `routes/memory-intelligence-routes.js` | Added runtime authority, routing recommendation, and protocol violation APIs | Lets the system demote or block unreliable models by task type |
| 2026-04-26 | `scripts/council-builder-preflight.mjs` | Fixed GITHUB_TOKEN false-claim: replaced fatal exit(1) + misleading "set it in Railway" message with non-fatal ENV_DIAGNOSIS_PROTOCOL guidance (vault vs runtime distinction) | §2.6 violation — preflight was asserting absence when vault/runtime are different facts |
| 2026-04-26 | `scripts/seed-epistemic-facts.mjs` | Created — seeds epistemic_facts from SSOT Change Receipts (RECEIPT/3), ENV_REGISTRY SET vars (VERIFIED/4), architectural invariants (TESTED/2–FACT/5) | Evidence engine was empty; needed initial corpus from existing truth sources |
| 2026-04-26 | `scripts/record-ci-evidence.mjs` | Created — records node --check outcomes as fact_evidence rows; promotes to TESTED after 3 passes; demotes to CLAIM on failure; non-fatal if DB unavailable | CI should feed the evidence engine automatically, not require manual seeding |
| 2026-04-26 | `routes/lifeos-council-builder-routes.js` | Added pre-commit JS syntax gate: temp file → node --check → 422 + protocol violation if broken; records ci_pass evidence on success; added `GET /history` endpoint exposing conductor_builder_audit | Builder was committing unvalidated JS; audit trail had no query surface |
| 2026-04-26 | `package.json` | Added scripts: memory:seed, memory:ci-evidence, verify:ci | Expose evidence seeding and CI recording as standard npm commands |
| 2026-04-26 | `prompts/lifeos-memory-intelligence.md` | Created — domain context file for Memory Intelligence System (builder can now target this domain) | Builder needs domain context to generate correct code in this domain |
| 2026-04-26 | `prompts/lifeos-platform.md` | Created — domain context file for Platform Core infrastructure | Builder needs platform domain context for middleware, startup, and build system work |
| 2026-04-26 | `docs/AGENT_RULES.compact.md` | Regenerated — added MEMORY + ANTI-CORNER-CUTTING section with design question, evidence ladder, INVARIANT gate, violation endpoints | Memory enforcement rules must be in the compact rules file every agent reads first |
| 2026-05-14 | `scripts/seed-lessons-learned.mjs` | **S2 — Memory Bootstrap.** Created — seeds `lessons_learned` table with 10 real lessons from AM36 change receipts + CONTINUITY_LOG repair-loop history. Each lesson cites exact source path (surfaced_by). All tagged confidence:medium or confidence:low. Script also writes `docs/INSTITUTIONAL_MEMORY_DIGEST.md` (committed static digest). `npm run memory:seed-lessons`. `node --check`: PASS. Seed confirmed: 10 rows in Neon production. | lessons_learned was at 0 rows (S1 only seeded epistemic_facts). S2 is the first real population of institutional memory from receipts. |
| 2026-05-14 | `scripts/generate-cold-start.mjs` | **S2 — Reader wired.** Added `docs/INSTITUTIONAL_MEMORY_DIGEST.md` as an input source; cold-start packet now includes an "Institutional Memory — top lessons (RECEIPT-class, not FACT)" section. Reader proof: `node scripts/generate-cold-start.mjs` → `docs/AI_COLD_START.md` confirmed to contain lesson content at line 225. | C17 reader-first contract: no active read path existed for lessons_learned before S2. Cold-start is the primary reader — every cold agent reads it. |
| 2026-05-14 | `docs/INSTITUTIONAL_MEMORY_DIGEST.md` | **S2 — Generated digest.** Auto-generated from DB rows by `seed-lessons-learned.mjs`. 10 lessons in 4 domains: agent-workflow, autonomy, build-governance, platform. Committed to repo so cold agents can read without DB connection. Regenerate: `npm run memory:seed-lessons`. | Static committed copy of lessons_learned for offline/cold-start access. |
| 2026-05-14 | `package.json` | Added `memory:seed-lessons` script | Expose S2 lesson seeding as standard npm command. |
