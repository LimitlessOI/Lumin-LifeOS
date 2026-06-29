<!-- SYNOPSIS: MEMORY NEON SCHEMA -->

# MEMORY NEON SCHEMA

**Status:** `governing_artifact`  
**Purpose:** Minimum Alpha Neon/Postgres table contract for the Memory Capsule System. Distinguishes canonical tables from derived-only tables.  
**Derived from:** [BLUEPRINT.md](/Users/adamhopkins/Projects/Lumin-LifeOS/docs/projects/memory-capsules/BLUEPRINT.md:1), [MEMORY_AUTHORITY_BRIDGE.md](/Users/adamhopkins/Projects/Lumin-LifeOS/docs/projects/memory-capsules/MEMORY_AUTHORITY_BRIDGE.md:1), [AMENDMENT_39_MEMORY_INTELLIGENCE.md](/Users/adamhopkins/Projects/Lumin-LifeOS/docs/products/memory-intelligence/PRODUCT_HOME.md:1)  
**Last revised:** 2026-05-21

---

## 1. Canonical Substrate Rule

For Alpha, Neon/Postgres is the canonical memory substrate.

That means:
- table rows in Neon/Postgres win conflicts
- external files and blob refs do not win trust conflicts
- `data/memories.json` is not canonical

---

## 2. Canonical Tables

### `epistemic_facts` — canonical

Purpose:
- evidence ladder spine
- memory candidate and fact state

Minimum columns:
- `id`
- `text`
- `domain`
- `level`
- `context_required`
- `false_when`
- `disproof_recipe`
- `source_count`
- `last_tested_at`
- `decay_rate`
- `review_by`
- `visibility_class`
- `canonical_id`
- `created_by`
- `created_at`
- `updated_at`

### `memory_capsules` — canonical

Purpose:
- capsule governance state
- truth class, trust level, retrieval permission, lineage

Minimum columns:
- `capsule_id`
- `fact_id`
- `title`
- `capsule_type`
- `truth_class`
- `trust_level`
- `evidence_level`
- `sensitivity`
- `source_type`
- `source_ref`
- `retrieval_permission`
- `task_scope`
- `retrieval_lane_ceiling`
- `canonical_statement_id`
- `fact_family_id`
- `review_by`
- `status`
- `legacy_import_method`
- `created_at`
- `updated_at`

### `retrieval_events` — canonical

Purpose:
- every retrieval
- acted-on vs merely returned distinction

Minimum columns:
- `id`
- `fact_id`
- `capsule_id`
- `retrieved_by`
- `context`
- `acted_on`
- `retrieved_at`
- `task_scope`
- `retrieval_lane`
- `why_retrieved`
- `allowed_use`
- `created_at`

### `debate_records` — canonical

Purpose:
- contradiction/debate history
- residue risk

Minimum columns:
- `id`
- `subject`
- `related_fact_id`
- `initial_positions`
- `arguments`
- `consensus`
- `residue_risk`
- `resolution_receipt_id`
- `created_at`
- `updated_at`

### `contradiction_records` — canonical

Purpose:
- explicit contradiction tracking between capsules

Minimum columns:
- `contradiction_id`
- `capsule_id_a`
- `capsule_id_b`
- `domain`
- `status`
- `resolution_required_by`
- `resolution_owner`
- `resolution_receipt_id`
- `created_at`
- `updated_at`

### `working_memory_entries` — canonical

Purpose:
- reconstruct active context used in decisions

Minimum columns:
- `id`
- `session_id`
- `capsule_id`
- `task_scope`
- `retrieval_lane`
- `injected_at`
- `used_in_decision`
- `decision_ref`
- `created_at`

### `memory_use_receipts` — canonical

Purpose:
- cite-or-ignore enforcement
- audit trail for influential memory

Minimum columns:
- `id`
- `capsule_id`
- `decision_ref`
- `use_type`
- `task_scope`
- `retrieval_lane`
- `receipt_type`
- `created_by`
- `created_at`

---

## 3. Derived-Only Tables and Views

These may exist in Neon/Postgres but are not the primary authority for trust state:

### `fact_level_history` — derived-only
- append-only audit history of evidence level changes

### `fact_evidence` — derived-only but load-bearing support
- evidence rows support promotions and demotions
- trust state still resolves through canonical fact + capsule rows

### `lessons_learned` — canonical for institutional lesson content, derived for trust of individual capsule rows

### `agent_performance` — derived-only
- supports routing and institutional review

### `agent_protocol_violations` — canonical for institutional incidents

### `agent_task_authority` — canonical for runtime authority policy, not for memory trust itself

### `intent_drift_events` — canonical for institutional incident memory

### `lesson_retrieval_roi` — derived-only view

### `stale_hypotheses` — derived-only view

---

## 4. Conflict Rules

If a trust-related field conflicts between stores:
- Neon canonical row wins
- external blob/body does not override trust state
- legacy row does not override capsule row
- derived-only views do not override canonical tables

If unresolved:

`HALT: MEMORY_STORE_DIVERGENCE`

---

## 5. Alpha Notes

Alpha does not require:
- full temporal graph schema
- vector index schema
- autonomous promotion machinery
- multi-tenant memory marketplace schema

Alpha does require:
- enough columns to enforce trust, evidence, retrieval lane, contradiction, and citation rules consistently
