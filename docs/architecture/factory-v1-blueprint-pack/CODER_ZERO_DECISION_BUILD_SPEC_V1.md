# Coder Zero-Decision Build Spec v1

## Status

- This is the A-to-Z build spec for the coding system inside Lumin.
- This is written for BPB so BPB can generate machine step packets for Builder/Coder.
- This is not a founder packet.
- This is not a product idea document.
- This is not direct Builder input until BPB converts it into step-atomic blueprint artifacts.

## Naming lock

- Full system: `Lumin`
- Coding/build subsystem: `BuilderOS`
- Lowest-tier coding executor: `Coder`

Use these meanings consistently:

- `Lumin` = whole trust/governance system
- `BuilderOS` = build machine inside Lumin
- `Coder` = lowest-cost execution model that only codes exact frozen steps

## Core build objective

Build a governed system where:

1. Adam and AIC resolve strategy once.
2. BPB converts that resolved intent into deterministic blueprint artifacts.
3. Coder receives only exact coding steps.
4. Coder never has to decide anything.
5. SENTRY blocks false green, future blind spots, and unsafe drift.
6. Historian records predictions, outcomes, and lessons.
7. TSOS measures efficiency without becoming mission authority.
8. C2 inside LifeOS surfaces truthfully what matters.

## Absolute laws for Coder

Coder must never:

- choose work
- prioritize work
- refine scope
- infer strategy
- select architecture
- invent support tasks
- invent patch plans
- invent acceptance criteria
- reinterpret founder intent
- reinterpret blueprint intent
- invent fallback work

Coder may only:

- execute exact file work
- detect when the step required non-coding judgment
- return blocker receipts upward immediately

## A-to-Z system flow

```text
Adam + AIC Product Development
-> Product Development Gate
-> Founder Packet
-> Founder Intent / Adam Filter check
-> BPB Intake Gate
-> BPB Blueprint Pack
-> SENTRY Freeze Review
-> Frozen Step Pack
-> Coder execution
-> SENTRY verification
-> Historian record
-> TSOS record
-> C2 surface update
-> AIC lesson review
```

## Category lock

Keep these categories separate:

- `Departments / actors`
  - `Founder`
  - `Sherry`
  - `AIC`
  - `BPB`
  - `Coder`
  - `SENTRY`
  - `Historian`
  - `TSOS`
- `LifeOS module`
  - `C2`
- `Stages / processes`
  - `Product Development`
  - `Blueprinting`
  - `Execution`
  - `Verification`
  - `Learning`
- `Protocols / mechanisms`
  - `Consensus Protocol`
  - `Conflict Resolution`
  - `Truth Ladder`
  - `Failure Ladder`
  - `Caching Governance`

`Product Development` is not a department.
`C2` is not a department.

## Decision ownership lock

### Founder

- owns mission, values, non-negotiables, and rare final founder-bound decisions

### AIC

- owns judgment, synthesis, consensus participation, challenge, and Product Development completion
- must actively contribute if present in a conflict-resolution session

### BPB

- owns deterministic translation into blueprint artifacts

### Coder

- owns exact coding execution only
- owns blocker detection when non-coding judgment was implicitly demanded

### SENTRY

- owns truth challenge, risk challenge, boundary challenge, freeze review, future lookback, and implementation verification

### Historian

- owns canonical memory, provenance, consensus records, predictions, outcomes, and lessons

### TSOS

- owns efficiency measurement, optimization proposals, routing evidence, and cache/prompt/JSON evaluation

### C2

- is the Command, Control, and Communication module inside LifeOS
- does not own judgment, blueprinting, execution, or truth promotion

## Upward routing chain

This routing is mandatory.

```text
Coder issue
-> BPB

BPB issue
-> AIC

AIC issue
-> Founder Intent / Adam Filter

Only if still unresolved and founder-bound
-> Adam
```

Rules:

- Coder never returns directly to Adam.
- Coder never returns directly to AIC unless BPB runtime explicitly wraps and forwards the blocker.
- BPB must not treat strategic ambiguity as normal.
- Strategic ambiguity found at BPB time is already `AIC_GATE_FAILURE` and `PRODUCT_DEVELOPMENT_FAILURE`.
- Adam should not have to touch the same strategic bottleneck twice because the system forgot.

## Blocker routing matrix

Use this exact routing:

| Blocker type | First receiver | Meaning | Normal correction owner |
| --- | --- | --- | --- |
| `ambiguous_spec` | `BPB` | blueprint step unclear | `BPB` |
| `missing_requirement` | `BPB` | required field/contract omitted | `BPB` |
| `conflicting_instruction` | `BPB` | step artifacts conflict | `BPB`, then `AIC` if conflict is strategic |
| `hidden_dependency` | `BPB` | step assumes undeclared dependency | `BPB` |
| `out_of_scope_request` | `BPB` | step tries to widen mission | `BPB`, then `AIC` if packet/gate failed |
| `authority_violation` | `BPB` | step asks coder to act outside role | `BPB` |
| `step_not_deterministic` | `BPB` | multiple valid outputs remain | `BPB` |
| `step_too_large` | `BPB` | step must be split | `BPB` |
| `external_failure` | `BPB` | infra/provider failure blocked work | `BPB`, with `TSOS` and `SENTRY` evidence |
| `strategic_ambiguity_detected` | `AIC` | upstream gate failed | `AIC`, treated as gate failure |

`strategic_ambiguity_detected` must not be a normal coder status.
If coder can infer strategic ambiguity from the step, the blueprint already failed.

## Required top-level system directories

Create these new roots for the rebooted machine:

```text
factory-core/
lifeos/c2/
docs/architecture/factory-v1-blueprint-pack/
```

Required `factory-core` layout:

```text
factory-core/
  canon/
  product-development/
  founder-packet/
  founder-intent/
  bpb/
  builder/
  sentry/
  historian/
  tsos/
  readiness/
  runtime/
  contracts/
  examples/
```

## Required final artifact classes

The complete system must eventually produce and maintain these artifact classes:

### Canon

- `CANONICAL_FACTORY_FOUNDATION_V2.md`
- `DEPARTMENT_CHARTERS_V2.md`
- `PROOF_SOURCE_REGISTRY_V1.md`
- `MATURITY_CLASSIFICATION_V1.md`
- `MISSION_STATE_MACHINE_V1.md`
- `LEGACY_QUARANTINE_RULES_V1.md`

### Product Development

- `PRODUCT_DEVELOPMENT_GATE.md`
- `FOUNDATION_QUESTION_SET.md`
- `DECISION_CATALOG.schema.json`
- `TRADEOFF_REGISTER.schema.json`
- `RISK_REGISTER.schema.json`
- `FOUNDER_ATTENTION_BUDGET.schema.json`
- `PRODUCT_DEVELOPMENT_RESULT.schema.json`

### Founder Packet

- `FOUNDER_PACKET_TEMPLATE_V2.md`
- `FOUNDER_PACKET.schema.json`
- `FOUNDER_PACKET_COMPLETENESS_CHECKLIST_V2.md`
- `FOUNDER_PACKET_FREEZE_RULES.md`
- `CHANGE_CONTROL_RULES.md`

### Founder Intent

- `FOUNDER_INTENT_MODEL.md`
- `FOUNDER_INTENT_SIMULATOR_INPUT.schema.json`
- `FOUNDER_INTENT_SIMULATOR_OUTPUT.schema.json`

### BPB

- `BPB_INTAKE_GATE.md`
- `BPB_INTAKE.schema.json`
- `BLUEPRINT_SCHEMA.json`
- `ACCEPTANCE_TESTS_SCHEMA.json`
- `AUTHORITY_CHECK_SCHEMA.json`
- `SALVAGE_MAP_SCHEMA.json`
- `BLOCKED_RETURN_SCHEMA.json`
- `DETERMINISM_TEST_PROTOCOL.md`

### BuilderOS / Coder

- `builder/execute-step.js`
- `builder/blocked-return.js`
- `builder/sandbox.js`
- `builder/action-handlers/*`
- `routes/factory-execute-step-routes.js`
- `contracts/acceptance-tests-registry.schema.json`

### SENTRY

- `sentry/blueprint-freeze-check.js`
- `sentry/verify-step-result.js`
- `sentry/future-lookback.js`
- `sentry/unintended-consequence-check.js`
- `sentry/proof-freshness.js`
- `sentry/anti-pattern-check.js`
- `sentry/review-output.schema.json`

### Historian

- `historian/record-decision.js`
- `historian/record-prediction.js`
- `historian/record-outcome.js`
- `historian/record-lesson.js`
- `historian/record-consensus-session.js`
- `historian/MEMORY_AUTHORITY_MAP_V2.md`
- `historian/MEMORY_TRUST_LEVELS.md`

### TSOS

- `tsos/record-step-metrics.js`
- `tsos/prompt-optimization-evaluator.js`
- `tsos/json-structure-evaluator.js`
- `tsos/cache-policy-engine.js`
- `tsos/model-routing-evaluator.js`
- `tsos/TSOS_HOOK_BOUNDARY_V2.md`
- `tsos/CACHING_GOVERNANCE_V1.md`

### Readiness / proof

- `readiness/system-readiness.js`
- `readiness/proof-freshness.js`
- `readiness/structural-proof-freshness.js`
- `readiness/runtime-proof-snapshot.js`
- `readiness/legacy-quarantine-registry.js`

### C2

- `lifeos/c2/C2_MODULE_CHARTER.md`
- `lifeos/c2/C2_STATE_MODEL.json`
- `lifeos/c2/C2_COMMUNICATION_PREFERENCES.json`
- `lifeos/c2/C2_ESCALATION_RULES.json`
- `lifeos/c2/C2_MODULE_IMPLEMENTATION_PLAN.md`

## Carry-forward parts from the old system

### Import as-is

- `startup/database.js`
- `services/council-service.js`
- `services/deployment-service.js`
- `services/railway-managed-env-service.js`
- `routes/railway-managed-env-routes.js`
- `services/logger.js`
- `scripts/builderos-groq-antipattern-scan.mjs`
- `scripts/verify-builder-output.mjs`
- `services/builderos-patch-mode-policy.js`

### Adapt and import

- `routes/lifeos-council-builder-routes.js`
- `scripts/council-builder-preflight.mjs`
- `services/useful-work-guard.js`
- `services/builderos-precommit-governance.js`
- `services/builderos-routing-policy.js`
- `services/builderos-model-escalation-gate.js`
- `services/builderos-control-plane-service.js`
- `services/builderos-system-alpha-readiness.js`
- `services/oil-proof-freshness.js`
- `services/self-repair-executor.js`
- `services/self-repair-deploy-scheduler.js`
- `services/memory-intelligence-service.js`
- `routes/memory-status-routes.js`
- `services/response-cache.js`
- `services/builderos-command-control-service.js`
- `routes/lifeos-builderos-command-control-routes.js`
- `routes/lifeos-command-center-routes.js`

### Archive and do not use as runtime authority

- `scripts/governed-overnight-backlog-run.mjs`
- `services/builderos-governed-loop-executor.js` as the direct future runtime model
- `routes/auto-builder-routes.js`
- amendment files as active execution authority

## Segment-by-segment build order

BPB must expand the phase plan into machine steps in this exact segment order.

### Segment 0 — Canon lock

Build first:

1. `factory-core/canon/CANONICAL_FACTORY_FOUNDATION_V2.md`
2. `factory-core/canon/DEPARTMENT_CHARTERS_V2.md`
3. `factory-core/canon/PROOF_SOURCE_REGISTRY_V1.md`
4. `factory-core/canon/MATURITY_CLASSIFICATION_V1.md`
5. `factory-core/canon/MISSION_STATE_MACHINE_V1.md`
6. `factory-core/canon/LEGACY_QUARANTINE_RULES_V1.md`

No later segment may redefine these terms.

### Segment 1 — Product Development contracts

Build second:

1. question set
2. decision catalog schema
3. tradeoff register schema
4. risk register schema
5. founder attention budget schema
6. product development result schema
7. Product Development gate rules

This segment exists to stop strategic ambiguity from reaching BPB.

### Segment 2 — Founder Packet contracts

Build third:

1. Founder Packet template
2. Founder Packet schema
3. completeness checklist
4. freeze rules
5. change control rules

This segment exists to make founder intent structured and machine-checkable.

### Segment 3 — Founder Intent / Adam Filter

Build fourth:

1. founder intent model charter
2. simulator input schema
3. simulator output schema
4. escalation-required rules

This segment exists to reduce founder interruption and prevent repeated founder touches.

### Segment 4 — BPB intake and compilation

Build fifth:

1. BPB intake gate
2. BPB intake schema
3. blueprint schema
4. acceptance tests schema
5. authority check schema
6. salvage map schema
7. blocked return schema
8. determinism protocol

This segment exists to convert resolved intent into deterministic coder work.

### Segment 5 — Coder runtime

Build sixth:

1. sandbox boundary
2. blocked return helper
3. execute-step runtime
4. action handler registry
5. route surface
6. acceptance test registry contract

This segment exists to let low-tier coding models execute exact work and nothing else.

### Segment 6 — SENTRY stack

Build seventh:

1. blueprint freeze checker
2. implementation verifier
3. proof freshness engine
4. anti-pattern checker
5. future lookback engine
6. unintended consequence checker
7. review output schema

This segment exists to stop false green and short-horizon blindness.

### Segment 7 — Historian

Build eighth:

1. decision recorder
2. prediction recorder
3. outcome recorder
4. lesson recorder
5. consensus session recorder
6. memory authority map
7. memory trust levels

This segment exists to preserve truth, not flattering summaries.

### Segment 8 — TSOS

Build ninth:

1. step metrics recorder
2. prompt optimization evaluator
3. JSON structure evaluator
4. cache policy engine
5. model routing evaluator
6. TSOS hook boundary
7. caching governance

This segment exists to reduce waste without creating drift.

### Segment 9 — C2 inside LifeOS

Build tenth:

1. C2 charter
2. state model
3. communication preferences
4. escalation rules
5. implementation plan

This segment exists to surface truthfully what matters and let Adam control communication density.

### Segment 10 — Readiness and proof surfaces

Build eleventh:

1. system readiness
2. proof freshness
3. structural proof freshness
4. runtime proof snapshot
5. legacy quarantine registry

This segment exists to prevent docs-only green states.

### Segment 11 — Full proof mission

Build twelfth:

1. one Product Development result
2. one Founder Packet
3. one Founder Intent prediction pass
4. one BPB intake pass
5. one BPB blueprint
6. one SENTRY freeze pass
7. one Coder execution pass
8. one SENTRY verification pass
9. one Historian record set
10. one TSOS record set
11. one C2 update
12. one AIC lesson review

This segment exists to prove the whole governed loop, not just execution.

## Mandatory salvage application rules

When BPB compiles machine steps from this spec, it must classify every carry-forward part into exactly one of these:

- `IMPORT_AS_IS`
- `ADAPT_AND_IMPORT`
- `REFERENCE_ONLY`
- `ARCHIVE_ONLY`
- `REJECT`

Every salvage record must contain:

- `source_path`
- `classification`
- `target_path`
- `reason_kept_or_rejected`
- `known_risks`
- `required_refactors`
- `acceptance_proof_required`

No old-system file may be silently reused.
No old-system file may become canonical authority by convenience.

## Required build phases

## Phase 0 — Canon and vocabulary lock

### Objective

Freeze the governing language before building more code.

### Required outputs

- `factory-core/canon/CANONICAL_FACTORY_FOUNDATION_V2.md`
- `factory-core/canon/DEPARTMENT_CHARTERS_V2.md`
- `factory-core/canon/PROOF_SOURCE_REGISTRY_V1.md`
- `factory-core/canon/MATURITY_CLASSIFICATION_V1.md`
- `factory-core/canon/MISSION_STATE_MACHINE_V1.md`
- `factory-core/canon/LEGACY_QUARANTINE_RULES_V1.md`

### Required content

`PROOF_SOURCE_REGISTRY_V1.md` must define:

- GitHub = source
- Railway = runtime
- Neon = data
- local repo/shell = mirror/workbench
- what counts as runtime proof
- what counts only as support context

`MATURITY_CLASSIFICATION_V1.md` must define:

- `NOT_WIRED`
- `WIRED`
- `LIVE`
- `PROVEN`
- `ACTIVE`
- `LEGACY`
- `ARCHIVED`
- `FORBIDDEN`
- `UNKNOWN_DO_NOT_TOUCH`

`MISSION_STATE_MACHINE_V1.md` must define:

- Proposed
- Clarified
- Council Review
- Approved
- BPB Blueprinting
- SENTRY Review
- Build Approved
- Building
- Verification
- Deployed
- Outcome Measured
- Lessons Captured

### Coder note

Coder never decides this content.
BPB creates exact file content steps for it.

## Phase 1 — Product Development system

### Objective

Build the upstream strategic closure system so BPB never sees unresolved strategy in the normal path.

### Required outputs

- `factory-core/product-development/PRODUCT_DEVELOPMENT_GATE.md`
- `factory-core/product-development/FOUNDATION_QUESTION_SET.md`
- `factory-core/product-development/DECISION_CATALOG.schema.json`
- `factory-core/product-development/TRADEOFF_REGISTER.schema.json`
- `factory-core/product-development/RISK_REGISTER.schema.json`
- `factory-core/product-development/FOUNDER_ATTENTION_BUDGET.schema.json`
- `factory-core/product-development/PRODUCT_DEVELOPMENT_RESULT.schema.json`

### Required `PRODUCT_DEVELOPMENT_RESULT.json` fields

- `status`
- `mission_id`
- `resolved_questions`
- `unresolved_questions`
- `founder_decisions`
- `rejected_alternatives`
- `accepted_assumptions`
- `phase_boundary`
- `founder_attention_budget`
- `risk_register`
- `salvage_guidance`

### Hard rule

If unresolved strategic ambiguity exists:

- result cannot be `PASS`
- BPB cannot start

## Phase 2 — Founder Packet system

### Objective

Turn Product Development output into a complete structured founder packet.

### Required outputs

- `factory-core/founder-packet/FOUNDER_PACKET_TEMPLATE_V2.md`
- `factory-core/founder-packet/FOUNDER_PACKET.schema.json`
- `factory-core/founder-packet/FOUNDER_PACKET_COMPLETENESS_CHECKLIST_V2.md`
- `factory-core/founder-packet/FOUNDER_PACKET_FREEZE_RULES.md`
- `factory-core/founder-packet/CHANGE_CONTROL_RULES.md`

### Required `FOUNDER_PACKET.json` fields

- `mission_id`
- `priority`
- `scope`
- `non_goals`
- `target_users`
- `success_criteria`
- `failure_criteria`
- `tradeoffs`
- `authority`
- `escalation`
- `resources`
- `founder_attention_budget`
- `existing_assets`
- `forbidden_carry_forward`
- `evidence_inputs`
- `risk_register`
- `founder_decision_log`
- `dependency_map`
- `phase_boundaries`
- `freeze_criteria`
- `change_control`
- `product_development_result_ref`

### Hard rule

No prose-only founder packet is valid.

## Phase 3 — Founder Intent / Adam filter

### Objective

Predict likely founder reaction before escalating back to Adam.

### Required outputs

- `factory-core/founder-intent/FOUNDER_INTENT_MODEL.md`
- `factory-core/founder-intent/FOUNDER_INTENT_SIMULATOR_INPUT.schema.json`
- `factory-core/founder-intent/FOUNDER_INTENT_SIMULATOR_OUTPUT.schema.json`

### Required output fields

- `predicted_founder_preference`
- `predicted_pushback`
- `confidence`
- `alternate_preference_candidates`
- `reasoning_summary`
- `escalation_required`

### Hard rule

If a founder-bound issue can be resolved by:

- Product Development result
- Founder Packet
- Founder Intent Model

then do not interrupt Adam.

The simulator output must also include:

- predicted decision
- predicted objections
- confidence
- likely preferred alternative
- whether Adam would likely ask for more evidence
- whether this exceeds pre-authorized founder bounds

## Phase 4 — BPB intake and blueprint compiler

### Objective

Convert complete founder packet into deterministic blueprint artifacts.

### Required outputs

- `factory-core/bpb/BPB_INTAKE_GATE.md`
- `factory-core/bpb/BPB_INTAKE.schema.json`
- `factory-core/bpb/BLUEPRINT_SCHEMA.json`
- `factory-core/bpb/ACCEPTANCE_TESTS_SCHEMA.json`
- `factory-core/bpb/AUTHORITY_CHECK_SCHEMA.json`
- `factory-core/bpb/SALVAGE_MAP_SCHEMA.json`
- `factory-core/bpb/BLOCKED_RETURN_SCHEMA.json`
- `factory-core/bpb/DETERMINISM_TEST_PROTOCOL.md`

### BPB intake rejection conditions

- Product Development did not pass
- Founder Packet incomplete
- strategic ambiguity remains
- phase boundaries unclear
- salvage guidance unclear
- evidence inputs unclear
- non-goals unclear

### Required BPB outputs per mission

- `FOUNDER_PACKET.json`
- `BLUEPRINT.json`
- `ACCEPTANCE_TESTS.json`
- `AUTHORITY_CHECK.json`
- `SALVAGE_MAP.json`
- `BLOCKED_RETURN_SCHEMA.json`
- `BLUEPRINT_RECEIPT.json`

### Required blueprint step fields

- `mission_id`
- `blueprint_id`
- `step_id`
- `phase_id`
- `target_file`
- `action_type`
- `dependencies`
- `content_or_patch_contract`
- `non_goals`
- `acceptance_test_ids`
- `sandbox_boundary`
- `authority_owner`
- `on_block`

### Hard rule

If different same-tier Coder models would build materially different outputs from the blueprint, the blueprint failed.

## Phase 5 — BuilderOS / Coder runtime

### Objective

Build the exact execution runtime for low-cost coding models.

### Required outputs

- `factory-core/builder/execute-step.js`
- `factory-core/builder/blocked-return.js`
- `factory-core/builder/sandbox.js`
- `factory-core/builder/action-handlers/`
- `factory-core/routes/factory-execute-step-routes.js`
- `factory-core/contracts/acceptance-tests-registry.schema.json`

### Required coder actions

Coder action types must be explicitly whitelisted.
Initial allowed action types:

- `write_file_exact`
- `append_file_exact`
- `replace_file_exact`
- `bounded_patch_exact`
- `mkdir_exact`

Any additional action type requires:

- BPB schema update
- SENTRY freeze review
- same-tier determinism re-check
- new acceptance tests

### Coder allowed statuses

- `DONE`
- `BLOCKED_RETURN_TO_BPB`
- `FAILED_VERIFICATION`

### Required blocker classes

- `ambiguous_spec`
- `missing_requirement`
- `conflicting_instruction`
- `hidden_dependency`
- `out_of_scope_request`
- `authority_violation`
- `step_not_deterministic`
- `step_too_large`
- `external_failure`

### Hard rules

- Coder may write only inside blueprint sandbox
- Coder may not accept caller-supplied acceptance tests
- Coder may not emit any fourth status
- Coder may not inspect unrelated files beyond explicitly provided context files
- Coder may not change action type mid-step
- Coder may not continue after detecting a required non-coding judgment
- Coder must return blocker on the first detected non-coding judgment demand

### Required same-tier determinism test

Before a blueprint step is frozen for Coder execution:

1. run the exact same step packet through at least two executions using the intended Coder model tier
2. compare resulting output plans or output files
3. if materially different, mark step `NON_DETERMINISTIC`
4. send back to BPB

Do not use stronger models to prove a step intended for weaker execution models.

## Phase 6 — SENTRY freeze and verify stack

### Objective

Build the challenge layer for blueprints and implementation outputs.

### Required outputs

- `factory-core/sentry/blueprint-freeze-check.js`
- `factory-core/sentry/verify-step-result.js`
- `factory-core/sentry/future-lookback.js`
- `factory-core/sentry/unintended-consequence-check.js`
- `factory-core/sentry/proof-freshness.js`
- `factory-core/sentry/anti-pattern-check.js`
- `factory-core/sentry/review-output.schema.json`

### Required SENTRY review lanes

- truth check
- risk check
- boundary check
- determinism check
- exact-content or exact-contract verification
- anti-pattern scan
- 6 month lookback
- 1 year lookback
- 2 year lookback
- unintended consequences
- recommend fixes/improvements to AIC

### Required future-lookback outputs by horizon

For each mission-level freeze review, SENTRY must produce:

- `6_month_harms`
- `6_month_benefits`
- `1_year_harms`
- `1_year_benefits`
- `2_year_harms`
- `2_year_benefits`
- `break_modes`
- `prevention_paths`
- `recommended_improvements_to_aic`

SENTRY should not use the word `impossible` as a lazy stop.
It must prefer:

- what blocks this now
- what would make it possible
- what would reduce the cost
- what stronger alternative path exists

### Required `SENTRY_REVIEW.json` fields

- `blueprint_status`
- `implementation_status`
- `blocking_findings`
- `future_horizon_findings`
- `unintended_consequence_findings`
- `recommended_preventions`
- `recommended_improvements`

### Hard rule

No blueprint freezes without SENTRY pass.
No completed build claims success without SENTRY verification pass.

## Phase 7 — Historian system

### Objective

Build the canonical memory and lesson system for the factory.

### Required outputs

- `factory-core/historian/record-decision.js`
- `factory-core/historian/record-prediction.js`
- `factory-core/historian/record-outcome.js`
- `factory-core/historian/record-lesson.js`
- `factory-core/historian/record-consensus-session.js`
- `factory-core/historian/MEMORY_AUTHORITY_MAP_V2.md`
- `factory-core/historian/MEMORY_TRUST_LEVELS.md`

### Required records

- decision
- prediction
- confidence
- outcome
- variance
- lesson
- original positions
- final synthesis
- who changed mind and why
- domain accuracy trend

### Memory trust levels

- observed
- attributed
- corroborated
- outcome-linked
- trusted

### Hard rules

- no silent trust promotion
- no silent trust demotion
- no history overwrite
- evidence and outcomes must remain traceable

### Required consensus session record fields

- `session_id`
- `issue_type`
- `participants`
- `initial_positions`
- `argued_other_side_records`
- `consensus_depth_reached`
- `final_consensus`
- `final_synthesis`
- `predicted_outcome`
- `actual_outcome`
- `domain_accuracy_updates`

## Phase 8 — TSOS system

### Objective

Build bounded efficiency intelligence.

### Required outputs

- `factory-core/tsos/record-step-metrics.js`
- `factory-core/tsos/prompt-optimization-evaluator.js`
- `factory-core/tsos/json-structure-evaluator.js`
- `factory-core/tsos/cache-policy-engine.js`
- `factory-core/tsos/model-routing-evaluator.js`
- `factory-core/tsos/TSOS_HOOK_BOUNDARY_V2.md`
- `factory-core/tsos/CACHING_GOVERNANCE_V1.md`

### Required measurement lanes

- token usage
- latency
- retries
- waste
- prompt compression effect
- JSON/schema effect
- cache usefulness
- routing effectiveness

### Required TSOS governance lanes

- prompt optimization proposals
- JSON structure proposals
- cache hit quality
- cache staleness cost
- strong-model overuse detection
- weak-model false-savings detection
- retry-loop waste detection

### Hard rule

Any optimization that saves cost but increases drift is a failed optimization.

## Phase 9 — C2 inside LifeOS

### Objective

Build the Command, Control, and Communication module inside LifeOS.

### Required outputs

- `lifeos/c2/C2_MODULE_CHARTER.md`
- `lifeos/c2/C2_STATE_MODEL.json`
- `lifeos/c2/C2_COMMUNICATION_PREFERENCES.json`
- `lifeos/c2/C2_ESCALATION_RULES.json`
- `lifeos/c2/C2_MODULE_IMPLEMENTATION_PLAN.md`

### Required C2 behaviors

- communicate with the system
- surface mission state
- surface action queue
- expand/compress detail
- adapt to current importance
- show critical escalations
- allow founder to change interaction density

### Required C2 controls

- minimize
- expand
- show more detail
- show less detail
- switch communication density
- switch explanation depth
- reorder surfaced goals by current importance
- accept direct founder commands

### Critical escalation trigger

Only when all are true:

- money, trust, or critical live operation is being harmed
- the system could not stop or contain it
- founder awareness reduces damage

## Phase 10 — Readiness / proof / classification surfaces

### Objective

Build truthful readiness surfaces for the new factory.

### Required outputs

- `factory-core/readiness/system-readiness.js`
- `factory-core/readiness/proof-freshness.js`
- `factory-core/readiness/structural-proof-freshness.js`
- `factory-core/readiness/runtime-proof-snapshot.js`
- `factory-core/readiness/legacy-quarantine-registry.js`

### Hard rules

- stale proof blocks ready
- missing governed proof blocks ready
- docs never outrank runtime proof
- duplicate canonical paths must surface as structural drift

## Phase 11 — One complete proof mission

### Objective

Run one real mission end-to-end through the full factory.

### Required proof mission coverage

- Product Development
- Founder Packet
- Founder Intent Model
- BPB intake
- BPB blueprint
- SENTRY freeze
- Coder execution
- SENTRY verification
- Historian record
- TSOS record
- C2 update
- AIC lesson review

### Required pass conditions

- founder touched strategy once
- no strategic ambiguity reached BPB
- Coder made zero decisions
- SENTRY blocked false green
- Historian recorded prediction and outcome
- TSOS recorded cost and latency
- C2 reflected truthful state

## Phase 12 — Product mission salvage

### Objective

Use the proven factory to blueprint the first product mission.

### Required outputs

- `PRODUCT_SALVAGE_CANDIDATES.json`
- first product `FOUNDER_PACKET.json`
- first product `BLUEPRINT.json`

### Hard rule

No product mission may bypass the proven factory.

## Required execution constraints for BPB when converting this into machine steps

For every phase above, BPB must emit steps that tell Coder exactly:

- which file to create or modify
- whether it is new file, exact write, append, replace, or bounded patch
- exact content or exact patch contract
- exact exports required
- exact non-goals
- exact acceptance tests
- exact on-block behavior

If any Coder step would still force a design decision, BPB failed.

## Required machine step anatomy

Every machine step BPB emits from this spec must contain at least:

- `mission_id`
- `blueprint_id`
- `step_id`
- `phase_id`
- `title`
- `target_file`
- `action_type`
- `exact_inputs`
- `exact_output_contract`
- `allowed_context_files`
- `forbidden_context_files`
- `dependencies`
- `non_goals`
- `acceptance_test_ids`
- `blocked_return_type_on_failure`
- `sandbox_boundary`
- `authority_owner`

If exact output cannot be represented as a full file, BPB must provide:

- exact patch contract
- exact changed symbols
- exact forbidden side effects
- exact acceptance proof

It is BPB's job to compress ambiguity to zero.
Coded execution is not allowed to absorb design uncertainty.

## Required acceptance discipline

Every step acceptance must be mechanically checkable.

Allowed examples:

- `node --check` passes
- required export exists
- exact route exists
- exact JSON parses
- file contains exact symbol
- file exactly matches expected content where required
- response status matches allowed values

Forbidden acceptance wording:

- should
- appropriately
- properly
- adequately
- as needed
- cleanly

## Required archive and Historian policy

The old system must be retained as archive.

Historian should later document:

- what survived
- what was adapted
- what was rejected
- what failures the reboot prevents

Your uploaded conversation corpus should be used for:

- Historian input
- Founder Intent / Adam filter calibration
- product SSOT mining

But it may not auto-promote to:

- law
- trusted practice
- current truth

## Final build success definition

This build succeeds when the coding subsystem no longer requires the coding model to decide anything beyond:

- execute the exact step
- or return a blocker because the step improperly required judgment

That is the standard.
