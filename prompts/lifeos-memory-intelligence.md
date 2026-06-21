<!-- SYNOPSIS: Domain: Memory Intelligence System (AMENDMENT_39) -->

# Domain: Memory Intelligence System (AMENDMENT_39)

## What this domain does
The Memory Intelligence System is the epistemic foundation of the entire platform. It replaces the file-as-fact model with an evidence engine: every stored fact carries its own confidence history, scope, decay rate, and adversarial trial count. The system's behavior is proportional to proof, not assertion.

**Governing design question:** Not "what do we know?" but "what has earned the right to influence action, at what weight, in this context?"

## The Two Ladders — never confuse them
- **Evidence Ladder** (this system): CLAIM(0) → HYPOTHESIS(1) → TESTED(2) → RECEIPT(3) → VERIFIED(4) → FACT(5) → INVARIANT(6)
- **Governance Ladder** (NSSOT): Constitutional Article → Ratified Amendment → Operational Rule → Working Guideline

INVARIANT ≠ LAW. LAW is governance vocabulary. These ladders never cross. A fact cannot auto-promote to constitutional weight.

## Owned files
- `db/migrations/20260426_memory_intelligence.sql` — core schema (7 tables, 2 views)
- `db/migrations/20260426_memory_intelligence_hardening.sql` — source count + hardening
- `db/migrations/20260426_memory_protocol_enforcement.sql` — violations + task authority
- `services/memory-intelligence-service.js` — evidence engine (17 functions + LEVEL constants)
- `routes/memory-intelligence-routes.js` — API surface (16+ endpoints)

## DB Tables
| Table | Purpose |
|---|---|
| `epistemic_facts` | Core fact store with level (0-6), scope, adversarial history |
| `fact_evidence` | Every trial result — ci_pass, confirmation, exception, adversarial |
| `fact_level_history` | Append-only level changes — no silent edits |
| `retrieval_events` | Every retrieval for ROI measurement |
| `debate_records` | Full debate structure with residue_risk |
| `lessons_learned` | Categorized lessons with ROI tracking |
| `agent_performance` | Track record by task type (includes "adam") |
| `agent_protocol_violations` | Corner-cutting / misalignment memory |
| `agent_task_authority` | Runtime routing permission (allowed/watch/blocked) |
| `intent_drift_events` | §2.11b asked-vs-shipped as memory event |

## API surface (all at /api/v1/memory)
- `GET /health` — system summary
- `GET /facts` — query with context-weighted scoring
- `POST /facts` — record fact (must declare level)
- `POST /facts/:id/evidence` — add evidence (may auto-promote/demote)
- `POST /facts/:id/promote` — promote one level (INVARIANT requires adversarial gate)
- `POST /facts/:id/demote` — demote immediately
- `GET/POST /debates` — debate records
- `GET/POST /lessons` — lessons learned + ROI
- `GET /agents/:id/accuracy` — agent track record
- `POST /agents/performance` — record performance
- `GET/POST /agents/violations` — protocol violations
- `GET/POST /agents/authority` — routing authority
- `POST /intent-drift` — §2.11b drift event
- `GET /stale-hypotheses` — HYPOTHESIS facts past review_by

## Key rules for building in this domain
1. Every new fact MUST declare a level — no level = CLAIM by default
2. INVARIANT gate: `adversarial_count >= 3` AND `exception_count === 0` — cannot be bypassed
3. Level changes are always append-only in `fact_level_history` — never UPDATE level without inserting history
4. Debate records are separate from facts — debates inform facts, they are not facts
5. Residue risk (minority view) is stored in `residue_risk` JSONB, not discarded
6. Devil's advocate quality: `adversarial_quality` 0–5; quality < 3 does not count toward INVARIANT
7. Every fact needs `context_required` + `false_when` — most facts are conditionally true
8. Operator overrides count as evidence with `event_type: operator_override`

## Model guidance
- For schema changes: use structured SQL with clear comments
- For service changes: pure functions with pool as dependency; no global state
- For query logic: prefer explicit SQL over ORM; cite the table structure in comments
- For new evidence types: add to the CHECK constraint in the migration, not just the service
- Simplest change that achieves the goal — this is a foundation layer, not a feature layer

## What NOT to touch
- Do not merge the evidence ladder with the governance ladder (LAW vocabulary belongs to NSSOT)
- Do not add features to this domain that are better owned by specific LifeOS domains
- Do not bypass the INVARIANT gate — ever
- Do not add circular dependencies (this service should have no imports from other services)

## Next approved tasks
1. Seed initial facts from SSOT receipts: `npm run memory:seed`
2. Wire verifier/CI outputs to `POST /api/v1/memory/facts/:id/evidence` automatically
3. Add decay automation: scheduled job that lowers confidence on facts in high-churn areas
4. Add replay harness: snapshot conscious pack at decision time, re-run later to measure drift
