# AMENDMENT 39 — Memory Intelligence System

**Status:** Active — Phase 1 Complete + Governance Hardening + Builder Integration  
**Priority:** High  
**Owner:** Adam  
**Last Updated:** 2026-04-26  
**Stability:** Stable (Phase 1 + builder sync complete; Phases 2–4 in backlog)

---

## Mission

Replace the file-as-fact model with an **evidence engine**: every stored fact carries its own confidence history, source diversity, decay rate, and scope — and the system's behavior is proportional to that proof.

**Governing design question for every retrieval:**
> Not "what do we know?" but "what has earned the right to influence action, at what weight, in this context?"

This is not a second brain that contradicts the SSOT. It is the SSOT becoming self-aware about how confident it should be in itself.

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

## Owned Files

| File | Purpose |
|---|---|
| `db/migrations/20260426_memory_intelligence.sql` | Schema: all 7 tables + 2 views |
| `db/migrations/20260426_memory_intelligence_hardening.sql` | Source-count + future-lookback hardening |
| `db/migrations/20260426_memory_protocol_enforcement.sql` | Protocol violations + task authority |
| `services/memory-intelligence-service.js` | Core evidence engine logic |
| `routes/memory-intelligence-routes.js` | API surface |
| `docs/MEMORY_FRAMEWORK_DESIGN_BRIEF.md` | Full design brief (cross-model reviewed) |

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

## API Routes (mounted at `/api/v1/memory`)

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
- ✅ Mounted in startup/register-runtime-routes.js
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

**Current state (2026-04-26, session 2):**
Phase 1 fully built + extended:
- All 7 tables + 2 views auto-apply on deploy
- `npm run memory:seed` — seeds from SSOT sources (run once against Railway DB to populate initial facts)
- `npm run memory:ci-evidence` — records node --check results as fact_evidence (also part of `verify:ci`)
- Builder `/build` has a pre-commit syntax gate: broken JS returns 422 and logs a protocol violation
- Builder `/history` surfaces the conductor_builder_audit trail (NEW — added this session)
- Domain prompt files for builder: `prompts/lifeos-memory-intelligence.md`, `prompts/lifeos-platform.md`
- Tables are still empty on Railway until `memory:seed` is run

**Next priority (in order):**
1. **Run `npm run memory:seed` against Railway** — tables are empty until this runs
2. **Wire `memory:ci-evidence` into `.github/workflows/smoke-test.yml`** — auto-record CI results as evidence
3. **Add auto-seed on boot** — check if `epistemic_facts` is empty, run seed automatically (Platform domain)
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
