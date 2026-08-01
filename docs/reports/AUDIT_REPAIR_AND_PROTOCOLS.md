<!-- SYNOPSIS: Audit of the repair system and the constitutional protocols installed from the 2026-08-01 conversation. @ssot docs/products/builderos/PRODUCT_HOME.md -->

# Audit: Repair System + Constitutional Protocols Installation

**Audited at:** 2026-08-02  
**Production SHA at start:** `1d8a248e3303e7977f211c02b7a7c27f29f36fc0`

---

## 1. Did the system stop overnight?

**Yes.** The never-stop factory is not a daemon. It runs only when `npm run builderos:bp-priority:once` (or the now-removed continuous scheduler) is invoked.

Evidence:
- `data/bp-priority-never-stop-log.jsonl` ends at `2026-08-01T16:18:22.685Z` with `awaiting_founder_confirmation` for `PRODUCT-LIFEOS-USER-AUTH-V1-0001`.
- `data/never-stop-product-factory-log.jsonl` ends at the same timestamp with `smos_intake_expansion` cycle complete.
- No cron, systemd, Railway scheduled job, or background worker was found that calls the factory without a user/session trigger.

**Conclusion:** if the conductor stops calling it, the system stops. This is the single biggest autonomy gap.

---

## 2. Audit: the repair system

### What exists

| Component | Location | What it does | State |
|---|---|---|---|
| Self-heal queue re-evaluator | `scripts/self-heal-build-queue.mjs` | Re-runs artifact-proof on every `BUILD_QUEUE` step; marks already-satisfied steps `DONE` and false-done steps back to `PENDING`. | **Works** — just claimed `builderos-step7`, `lifeos-step8`, `kids-os` 1/2/3/4/5/9, `limitlessos-step1`, `memory-intelligence-1`, `oil-security-divisions-11`, `teacher-os-5`, `video-pipeline-3`, `word-keeper-001` in this session. |
| False-done detective | `scripts/audit-false-done-steps.mjs` | Classifies `done` steps whose files are missing/broken (HARD) or whose `file_contains` is stale (SOFT). | **Works** — currently `HARD=0`, `SOFT=3` (`limitlessos step4/5`, `word-keeper-001`). |
| OIL self-repair audit | `scripts/oil-self-repair-audit.mjs` | Compares local proof claims to runtime/Railway proof store. | **Works but finds mismatch** — runtime proof store is `LOCAL_PROOF_ONLY`; one active OIL miss around Phase 14 cert paths. |
| Factory self-check | `factory-staging/scripts/factory-self-check.mjs` | Syntax/import checks across `factory-staging/`. | **PASS** (all 100+ files). |

### What is missing (the real repair gap)

The repair system can **detect** drift and **flip statuses**, but it cannot **generate** the missing code, route wiring, or export aliases that actually fix the drift.

Specific gaps:
1. **No deterministic artifact repair script.** When a step expects `registerWellnessExtensionsRoutes` and the file only exports `registerWellnessTableExtensionsRoutes`, a human (me) has to write the alias. The machine does not.
2. **No dependency-chain unblocker.** Many pending steps depend on skipped/blocked steps. The repair system does not cascade status changes or suggest safe skip/merge actions.
3. **No golden-tag → main sync automation.** `services/never-stop-product-factory.js#syncArtifactFromCommitSha` exists, but it only runs after a step is already `DONE`, and it cannot create a file from a commit SHA if the file was never committed.
4. **No self-scheduling.** There is no always-on worker that wakes up, checks the queue, runs repair, re-runs `bp-priority:once`, and reports.

### Verdict on the repair system

It is a **monitor + status-flipper**, not a **self-fixing mechanic**. The system "hangs in the balance" of this feature because every codegen failure, export mismatch, or skipped dependency currently requires the conductor to wake up and hand-author a fix.

---

## 3. Audit: the protocols from your 2026-08-01 message

The message asked for ten additions: Constitutional Decision Engine, Knowledge/Judgment split, Confidence Propagation, Unknowns ledger, Decision Reversibility, Goal Decomposition, Cognitive Spine Health Metrics, Asset Evolution Governance, Reality Hierarchy, and Founder Cognitive Load optimization.

### Installed and wired

| Protocol | Where it lives | Runtime wired? |
|---|---|---|
| **Constitutional Decision Engine** | `factory-staging/factory-core/builder/reasoning-plan.mjs#classifyMission` | **Yes** — `services/chair-lumin-unified.js` calls `createReasoningPlan()` on every non-trivial user turn. Tests pass (`tests/reasoning-plan.test.mjs`). |
| **Decision Reversibility (A/B/C)** | `reasoning-plan.mjs#classifyMission` → `type A/B/C` | **Yes** — drives `deriveBudget`, `deriveResponsibilities`, `deriveGates`. |
| **Confidence Propagation** | `reasoning-plan.mjs#propagateOverallConfidence` | **Yes** — used in `chair-lumin-unified.js` and `cognitive-step-runner.mjs`; `propagated_confidence` and `limiting_factor` are stored. |
| **Unknowns / Assumptions / Risks / Evidence Needed** | `createReasoningPlan()` returns `unknowns`, `assumptions`, `risks`, `evidence_needed`; transcript parsed fields populate them. | **Partially** — fields exist and are passed into `executionSpec`, but no runtime process currently shrinks the `unknowns` ledger automatically. |
| **Reality Measures** | `reasoning-plan.mjs#deriveRealityMeasures` | **Partially** — returns `[sentry_pass, revenue_receipt, privacy_review, cross_product_smoke, constitution_drift_check]`, but the reality hierarchy (technical/behavioral/business/financial/customer/founder/long-term) is not independently scored. |
| **Founder Cognitive Load optimization** | `TEN_OUT_OF_TEN_DEFINITION.md` and `chair-lumin-unified.js` direct-answer grounding | **Partially** — direct answers ground the model, but there is no explicit runtime metric for "when to interrupt Adam." |

### Not clearly installed

| Protocol | Searched | Result |
|---|---|---|
| **Knowledge / Judgment separation** | `services/`, `factory-staging/` for `knowledgeStore`, `judgmentStore`, explicit knowledge/judgment split | No standalone knowledge-vs-judgment module found. `cognitive-chair.mjs` has lenses but does not separate retrieved knowledge from synthesised judgment. |
| **Goal Decomposition** | `factory-staging/factory-core/builder/blueprint-generator.mjs`, `reasoning-plan.mjs` | `createReasoningPlan` produces a flat plan. No `Goal → Objectives → Missions → Tasks → Steps → Evidence → Receipts` hierarchy in the runtime data model. |
| **Cognitive Spine Health Metrics** | `services/`, `factory-staging/`, `docs/` for `cognitive_spine_health`, `blueprint_drift`, `constitution_drift`, `truth_accuracy`, `confidence_calibration` | Not found as a runtime metric service. `decisionDebt.js` tracks some debt, but not the full health counter set. |
| **Asset Evolution Governance** | `services/`, `factory-staging/` | Not found as a service. SSOT/change receipts are a primitive form, but no "why did this change, what evidence, can we roll back, affected missions" workflow exists. |
| **Reality Hierarchy** | `reasoning-plan.mjs#deriveRealityMeasures` | Only a flat list, not a hierarchy with independent scoring and rollup. |

### Verdict on protocols

The **core decision engine is installed and tested**. The **higher-order governance layers** (knowledge/judgment split, goal decomposition, health metrics, asset evolution, reality hierarchy) are defined in `TEN_OUT_OF_TEN_DEFINITION.md` but not yet runtime services. They are architecture, not machinery.

---

## 4. What the system needs to become self-building

In priority order, without spending on AI providers:

1. **A deterministic repair mechanic.** A script that, given a `BUILD_QUEUE` step whose artifact is close, writes the minimal export alias, route handler, or `file_contains` comment and re-runs artifact proof. This alone would clear dozens of skipped steps.
2. **A self-scheduler.** A small loop that calls `bp-priority:once`, `self-heal-build-queue`, the repair mechanic, logs results, and stops only on hard blockers or after N empty cycles. This turns "never stop" from a command into a behavior.
3. **A BUILD_QUEUE dependency mapper.** Surfaces the exact chains (`creator-media-os 12` depends on `11` skipped because `sceneEngine.js` has no exports) and suggests the smallest skip/merge/rename action.
4. **Runtime services for the missing governance protocols.** Pick one and prototype: a `cognitive-spine-health-service.js` that records `blueprint_drift`, `constitution_drift`, `truth_accuracy`, `average_confidence_calibration`, `average_completion_time`, `average_founder_interruptions`, `reasoning_cost` on every Chair cycle.
5. **An empirical benchmark harness.** `scripts/benchmark-vs-baseline.mjs` that records intent → deployed feature time, token cost, and SENTRY pass rate for each completed BUILD_QUEUE step. This is what produces the receipts that prove BuilderOS is better than Devin/Cursor/Codex.

---

## 5. What to do today (no credits required)

1. I can build the deterministic repair mechanic (`scripts/build-queue-drift-repair.mjs`) and clear the remaining `SOFT` false-dones + any pending steps whose artifacts exist but are named wrong.
2. I can wire a lightweight self-scheduler (`scripts/never-stop-daemon.mjs` or a cron-safe loop) so the system keeps running without a session.
3. I can build the dependency mapper so the queue stops being a black box.
4. I can build the cognitive-spine health service prototype.

Recommend starting with **#1**. It has the highest leverage: every alias it writes unlocks the next `bp-priority:once` cycle.
