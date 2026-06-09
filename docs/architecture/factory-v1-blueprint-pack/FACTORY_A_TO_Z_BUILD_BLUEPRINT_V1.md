# Factory A-to-Z Build Blueprint v1

## Purpose

This is the full build blueprint for the factory system itself.

This is not the founder packet.
This is not the constitution.
This is not Builder input.

This is the system-construction blueprint that BPB must expand into machine step packets.

Goal:

Build the factory so that:

- Product Development resolves strategy once
- AIC produces complete founder packets
- BPB translates them into deterministic machine blueprints
- Builder only codes exact frozen steps
- SENTRY blocks false green and long-horizon blind spots
- Historian records truth, prediction, and lessons
- TSOS measures efficiency without becoming mission authority
- C2 exposes it inside LifeOS without becoming a separate brain

## Non-negotiable build laws

1. Strategic ambiguity must never reach BPB in the normal path.
2. Builder makes no decisions at all.
3. Builder must stop immediately when a step implicitly requires non-coding judgment.
4. Determinism must be tested at the same model tier intended for Builder execution.
5. Docs alone earn zero runtime maturity.
6. Ready states fail closed.
7. Receipts are append-only.
8. The founder should not have to touch the same strategic bottleneck twice because the system forgot.

## Canonical build sequence

```text
Phase 0  Canon lock
Phase 1  Product Development system
Phase 2  Founder Packet system
Phase 3  BPB intake + blueprint engine
Phase 4  Builder runtime
Phase 5  SENTRY freeze + verify stack
Phase 6  Historian memory + lessons
Phase 7  TSOS efficiency + optimization governance
Phase 8  C2 inside LifeOS
Phase 9  Readiness, proof, and classification surfaces
Phase 10 One full proof mission through the complete loop
Phase 11 Salvage-first product blueprinting
```

## Phase 0 — Canon lock

### Objective

Freeze one canonical authority stack and one canonical vocabulary before building more machinery.

### Outputs

- `docs/architecture/factory-v1-blueprint-pack/CANONICAL_FACTORY_FOUNDATION_V2.md`
- `docs/architecture/factory-v1-blueprint-pack/DEPARTMENT_CHARTERS_V2.md`
- `docs/architecture/factory-v1-blueprint-pack/PROOF_SOURCE_REGISTRY_V1.md`
- `docs/architecture/factory-v1-blueprint-pack/MATURITY_CLASSIFICATION_V1.md`

### Required content

`PROOF_SOURCE_REGISTRY_V1.md` must define:

- remote truth doctrine
- canonical runtime proof sources
- supporting-only sources
- what can and cannot raise maturity

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

### Acceptance

- all old `OIL` references in new canonical files replaced with `SENTRY`
- C2 explicitly locked as LifeOS module
- Product Development explicitly categorized as stage, not department

## Phase 1 — Product Development system

### Objective

Build the upstream stage that resolves all foreseeable strategic ambiguity before BPB begins.

### Outputs

- `factory-core/product-development/PRODUCT_DEVELOPMENT_GATE.md`
- `factory-core/product-development/DECISION_CATALOG.schema.json`
- `factory-core/product-development/TRADEOFF_REGISTER.schema.json`
- `factory-core/product-development/RISK_REGISTER.schema.json`
- `factory-core/product-development/FOUNDER_ATTENTION_BUDGET.schema.json`
- `factory-core/product-development/FOUNDATION_QUESTION_SET.md`

### Required logic

Product Development must explicitly resolve:

- mission
- priority
- scope
- non-goals
- users
- success and failure
- tradeoffs
- resources
- founder attention budget
- escalation boundaries
- accepted assumptions
- rejected alternatives
- phase boundaries
- risks
- evidence inputs
- salvage assumptions

### Output artifact

`PRODUCT_DEVELOPMENT_RESULT.json`

Required fields:

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

### Acceptance

- if unresolved strategic ambiguity exists, status cannot be `PASS`
- no path allows BPB start without a `PASS`

## Phase 2 — Founder Packet system

### Objective

Turn Product Development output into the full AIC-owned Founder Packet.

### Outputs

- `factory-core/founder-packet/FOUNDER_PACKET_TEMPLATE_V2.md`
- `factory-core/founder-packet/FOUNDER_PACKET.schema.json`
- `factory-core/founder-packet/FOUNDER_PACKET_COMPLETENESS_CHECKLIST_V2.md`
- `factory-core/founder-packet/FOUNDER_PACKET_FREEZE_RULES.md`
- `factory-core/founder-packet/CHANGE_CONTROL_RULES.md`

### Required logic

AIC may declare “we have what we need” only when:

- Product Development gate passed
- completeness checklist passed
- founder decision log present
- risk register present
- evidence sources identified
- non-goals explicit
- escalation boundaries explicit
- phase boundaries explicit

### Output artifact

`FOUNDER_PACKET.json`

Required fields:

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

### Acceptance

- BPB intake rejects packet if any required field missing
- no prose-only founder packet allowed

## Phase 3 — BPB intake + blueprint engine

### Objective

Build the deterministic translation layer from Founder Packet to Builder blueprint.

### Outputs

- `factory-core/bpb/BPB_INTAKE_GATE.md`
- `factory-core/bpb/BPB_INTAKE.schema.json`
- `factory-core/bpb/BLUEPRINT_SCHEMA.json`
- `factory-core/bpb/ACCEPTANCE_TESTS_SCHEMA.json`
- `factory-core/bpb/AUTHORITY_CHECK_SCHEMA.json`
- `factory-core/bpb/SALVAGE_MAP_SCHEMA.json`
- `factory-core/bpb/BLOCKED_RETURN_SCHEMA.json`
- `factory-core/bpb/MISSION_STATE_MACHINE.md`

### BPB intake rules

BPB must reject intake if:

- Product Development did not pass
- Founder Packet incomplete
- strategic ambiguity remains
- phase boundary unclear
- non-goals unclear
- salvage instruction unclear
- evidence inputs unclear

That rejection is:

- `AIC_GATE_FAILURE`
- `PRODUCT_DEVELOPMENT_FAILURE`

not a normal Builder loop.

### BPB output pack

For every mission, BPB must emit:

- `FOUNDER_PACKET.json`
- `BLUEPRINT.json`
- `ACCEPTANCE_TESTS.json`
- `AUTHORITY_CHECK.json`
- `SALVAGE_MAP.json`
- `BLOCKED_RETURN_SCHEMA.json`
- `BLUEPRINT_RECEIPT.json`

### Step contract

Every blueprint step must include:

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

### Determinism rule

BPB is only accepted when same-tier Builder models derive materially equivalent output expectations from the blueprint.

## Phase 4 — Builder runtime

### Objective

Build the execute-only runtime for low-cost coding models.

### Outputs

- `factory-core/builder/execute-step.js`
- `factory-core/builder/blocked-return.js`
- `factory-core/builder/sandbox.js`
- `factory-core/builder/action-handlers/`
- `factory-core/routes/factory-execute-step-routes.js`

### Builder allowed outputs

- `DONE`
- `BLOCKED_RETURN_TO_BPB`
- `FAILED_VERIFICATION`

### Builder required behavior

Builder must:

- execute one exact step
- stay inside sandbox
- never select work
- never prioritize work
- never create work
- never create patch plans
- never reinterpret blueprint
- detect when non-coding judgment is required

### Blocker classes

- `ambiguous_spec`
- `missing_requirement`
- `conflicting_instruction`
- `hidden_dependency`
- `out_of_scope_request`
- `authority_violation`
- `step_not_deterministic`
- `step_too_large`
- `external_failure`

### Acceptance

- Builder cannot access arbitrary repo paths
- Builder cannot accept caller-supplied acceptance tests
- Builder cannot emit any fourth status

## Phase 5 — SENTRY freeze + verify stack

### Objective

Build the adversarial layer that blocks blueprint drift and output drift.

### Outputs

- `factory-core/sentry/blueprint-freeze-check.js`
- `factory-core/sentry/verify-step-result.js`
- `factory-core/sentry/future-lookback.js`
- `factory-core/sentry/unintended-consequence-check.js`
- `factory-core/sentry/proof-freshness.js`
- `factory-core/sentry/anti-pattern-check.js`

### SENTRY review lanes

SENTRY must evaluate:

- truth
- risk
- boundary compliance
- blueprint determinism
- exact output compliance
- anti-pattern matches
- 6 month lookback
- 1 year lookback
- 2 year lookback
- unintended consequences
- outside comparable patterns where available

### Output artifact

`SENTRY_REVIEW.json`

Required fields:

- `blueprint_status`
- `implementation_status`
- `blocking_findings`
- `future_horizon_findings`
- `unintended_consequence_findings`
- `recommended_preventions`
- `recommended_improvements`

### Acceptance

- no blueprint may freeze without SENTRY pass
- no build may claim success without SENTRY verification pass

## Phase 6 — Historian memory + lessons

### Objective

Build canonical memory, prediction logging, lesson extraction, and domain correctness tracking.

### Outputs

- `factory-core/historian/record-decision.js`
- `factory-core/historian/record-prediction.js`
- `factory-core/historian/record-outcome.js`
- `factory-core/historian/record-lesson.js`
- `factory-core/historian/record-consensus-session.js`
- `factory-core/historian/memory-trust-levels.md`
- `factory-core/historian/MEMORY_AUTHORITY_MAP.md`

### Historian required records

- decision
- prediction
- confidence
- outcome
- variance
- lesson
- original conflicting positions
- final synthesis
- domain correctness trends

### Memory trust levels

- observed
- attributed
- corroborated
- outcome-linked
- trusted

### Acceptance

- memory edits must preserve history
- no silent trust promotion
- no memory trust promotion without provenance

## Phase 7 — TSOS efficiency + optimization governance

### Objective

Build bounded efficiency intelligence without letting metrics become mission authority.

### Outputs

- `factory-core/tsos/record-step-metrics.js`
- `factory-core/tsos/prompt-optimization.js`
- `factory-core/tsos/cache-value-evaluator.js`
- `factory-core/tsos/model-routing-evaluator.js`
- `factory-core/tsos/TSOS_HOOK_BOUNDARY.md`
- `factory-core/tsos/CACHING_GOVERNANCE.md`

### TSOS must measure

- token cost
- latency
- retries
- waste
- prompt compression effect
- JSON/schema efficiency effect
- cache effectiveness
- model routing effectiveness

### TSOS may propose

- prompt optimization
- JSON structuralization
- caching of stable proven answers
- routing changes
- cheaper execution tier use

### TSOS may not do

- declare mission priority
- declare truth
- rewrite strategy
- silently reduce scrutiny

### Acceptance

- every optimization proposal must include measured upside
- any optimization that increases drift is rejected

## Phase 8 — C2 inside LifeOS

### Objective

Build the Command, Control, and Communication module inside LifeOS.

### Outputs

- `lifeos/c2/C2_MODULE_CHARTER.md`
- `lifeos/c2/C2_STATE_MODEL.json`
- `lifeos/c2/C2_COMMUNICATION_PREFERENCES.json`
- `lifeos/c2/C2_ESCALATION_RULES.json`

### C2 requirements

C2 must:

- live inside LifeOS
- expose communication with the system
- expose founder action queue
- expose mission state
- expose critical escalations
- allow density/detail expansion and contraction
- adapt surfaced priorities based on context and feedback

### Critical escalation rule

Reserved only when:

- money is being lost or critical live operation is harmed
- the system could not stop or contain it
- founder awareness reduces damage

### Acceptance

- C2 is not modeled as a department anywhere
- C2 does not assign Builder work

## Phase 9 — Readiness, proof, and classification surfaces

### Objective

Build truthful visibility surfaces for the factory itself.

### Outputs

- `factory-core/readiness/system-alpha-readiness.js`
- `factory-core/readiness/proof-freshness.js`
- `factory-core/readiness/structural-proof-freshness.js`
- `factory-core/readiness/legacy-quarantine.js`
- `factory-core/readiness/runtime-proof-snapshot.js`

### Required rules

- readiness must fail closed
- stale proof blocks ready
- missing governed proof blocks ready
- docs never outrank runtime proof
- duplicate authority paths must be visible

### Acceptance

- high score with stale proof is impossible
- legacy-live conflicts are surfaced as blockers or warnings

## Phase 10 — one full proof mission

### Objective

Run one complete mission through the real upstream and downstream system.

### Mission scope

The proof mission must include:

- Product Development
- Founder Packet
- BPB intake
- BPB blueprint generation
- SENTRY freeze
- Builder execution
- SENTRY verify
- Historian record
- TSOS record
- C2 surface update

### Pass criteria

- founder touched strategy once
- no strategic ambiguity reached BPB
- Builder made zero decisions
- SENTRY blocked false green
- Historian captured prediction and outcome
- TSOS captured cost and latency
- C2 showed truthful state

## Phase 11 — salvage-first product blueprinting

### Objective

After the factory proves itself, blueprint the first product mission using approved parts-car salvage.

### Outputs

- `PRODUCT_SALVAGE_CANDIDATES.json`
- first product `FOUNDER_PACKET.json`
- first product `BLUEPRINT.json`

### Required rules

- no product blueprint may bypass the proven factory
- all product salvage must be classified:
  - import as-is
  - adapt and import
  - lessons only
  - do not carry forward

## Parts-car import map

### Import as-is

- `startup/database.js`
- `services/council-service.js`
- `services/deployment-service.js`
- `services/railway-managed-env-service.js`
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

### Do not carry forward

- `scripts/governed-overnight-backlog-run.mjs`
- `services/builderos-governed-loop-executor.js`
- support-task generation
- patch-plan recursion
- autonomous work invention

## Delivery order

### Segment 1

Build Phases 0 through 3.

Reason:

- until Product Development, Founder Packet, and BPB are real, execution discipline is downstream theater

### Segment 2

Build Phases 4 and 5.

Reason:

- Builder and SENTRY are the first executable hard loop

### Segment 3

Build Phases 6 through 9.

Reason:

- memory, efficiency, C2, and readiness become meaningful after the core execution loop exists

### Segment 4

Run Phase 10 proof mission.

### Segment 5

Only then begin Phase 11 product blueprinting.

## Build success definition

The factory is successful when:

- Product Development resolves strategy once
- BPB receives no strategic ambiguity
- Builder executes exact coding only
- SENTRY blocks false green and long-horizon blind spots
- Historian preserves outcome truth and calibration
- TSOS reduces waste without reducing trust
- C2 truthfully surfaces system state inside LifeOS
- one full mission runs end-to-end without making Adam solve the same bottleneck twice
