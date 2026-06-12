# BUILDEROS A-TO-Z BLUEPRINT

**Status:** `LIVE — AS-BUILT`
**Owner:** Adam
**Last Updated:** 2026-06-11
**Certification ceiling:** `BOOTSTRAP_AND_STAGING_READY` — `FULLY_MACHINE_READY=false`
**Runtime truth at creation:** 33/33 missions complete; `npm run factory:ci` → 16/16 PASS

Any model reading this file has enough information to replicate the exact system that exists.

---

## 1. Identity

BuilderOS is the **autonomous programming machine**. It detects issues, classifies them, authorizes bounded work, executes repairs, verifies outcomes, writes receipts, and prevents repeated failures — without Adam handling routine operations.

**BuilderOS is NOT LifeOS.** LifeOS is the product built BY BuilderOS.
**BuilderOS is NOT TSOS.** TSOS is the external AI efficiency product.
**Docs alone earn zero Alpha credit.** Only live endpoint responses and runtime JSONL files count as proof.

---

## 2. Authority Layers (read order for any agent)

```
prompts/00-SYSTEM-AUTHORITY-LAYERS.md   ← mandatory boundary read
prompts/00-HIST-LEGACY-BOUNDARY.md      ← mandatory STOP (legacy = Hist domain, not a README)
builderos-reboot/AGENTS.md              ← machine layer rules
factory-staging/AGENTS.md              ← factory runtime rules
```

Three authority layers in descending priority:
1. **Production spine** — `server.js`, `routes/`, `services/` (Railway-hosted LifeOS)
2. **Machine layer** — `builderos-reboot/` (mission packs, blueprint authority)
3. **Factory runtime** — `factory-staging/` (execute-step hot path, runs on port 3099)

---

## 3. Exact File Tree

### `builderos-reboot/` — Machine Layer

```
builderos-reboot/
├── AGENTS.md                          # agent rules for this layer
├── CURRENT_STATE.json                 # certification state, active mission, CI command
├── MISSION_QUEUE.json                 # ordered list of all missions + status
├── HANDOFF.md                         # resume state for next operator
├── INDEX.md                           # machine layer index
├── DETERMINISM_RECEIPT.json           # mechanical determinism proof
├── GREENFIELD_DETERMINISM_RECEIPT.json
├── DUPLICATION_RECEIPT.json
├── FULL_LOOP_PROOF_RECEIPT.json
├── SENTRY_AUDIT_REPORT.md
├── AUTO_PILOT_PROTOCOL.md
├── PSSOT_VOCABULARY.md
├── MISSIONS/
│   ├── FACTORY-REBOOT-0001/           # bootstrap: workspace + first BPB pack
│   │   ├── BLUEPRINT.json             # step definitions
│   │   ├── ACCEPTANCE_TESTS.json      # per-step acceptance tests
│   │   ├── FOUNDER_PACKET.json
│   │   ├── PRODUCT_DEVELOPMENT_RESULT.json
│   │   └── CONTENT/                   # source files for write_file_exact steps
│   ├── FACTORY-REBOOT-0002/ … 0030/   # progressive factory build
│   ├── FACTORY-REBOOT-0031/           # department-first routing (QUEUED)
│   ├── FACTORY-DELIBERATION-V27-0001/ # deliberation governance wired, uncommitted
│   ├── FACTORY-GREENFIELD-0001/       # greenfield determinism proof
│   ├── FACTORY-PROOF-LOOP-0001/
│   ├── PRODUCT-MARKETINGOS-SALVAGE-0001/
│   └── PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/ # first product mission (PSSOT done)
└── scripts/
    ├── factory-ci.mjs                 # 16/16 CI checks
    ├── run-all-mission-acceptance.mjs
    ├── run-mission-acceptance.mjs
    ├── run-sentry-checks.mjs
    ├── run-full-loop-proof.mjs
    ├── emit-project-certification.mjs
    ├── factory-tsos-integration.mjs
    ├── factory-tools-integration.mjs
    ├── autopilot-runner.mjs
    └── ... (30+ scripts total)
```

### `factory-staging/` — Factory Runtime

```
factory-staging/
├── AGENTS.md                          # runtime rules: council quarantined, TSOS measurement only
├── README.md
├── server.js                          # Express entry; 14 lines; port 3099
├── startup/
│   └── register-routes.js            # registers all 13 factory routes onto app
├── data/
│   ├── deliberation-gate.jsonl        # deliberation receipts (append-only)
│   ├── historian-records.jsonl        # step execution records (append-only)
│   ├── sentry-reviews.jsonl           # SENTRY review artifacts (append-only)
│   └── tsos-step-metrics.jsonl        # TSOS efficiency metrics (append-only)
└── factory-core/
    ├── bpb/
    │   └── intake-gate.js             # runBpbIntakeGate(), validateBlueprintSteps()
    ├── builder/
    │   ├── run-step.js                # dispatchExecuteStep(), runWriteFileExact()  ← HOT PATH
    │   ├── run-mission.js             # dispatchExecuteMission(), loadBlueprintFromRepo()
    │   ├── execute-step.js            # executeStep() — descriptor only (3 rules)
    │   ├── blocked-return.js          # buildBlockedReturn()
    │   ├── sandbox.js                 # getSandboxBoundary()
    │   └── action-handlers/
    │       └── write-file-exact.js    # writeFileExactContract()
    ├── canon/
    │   ├── deliberation-governance.js # all deliberation v2.7 constants + validators
    │   ├── MISSION_STATE_MACHINE.json # 12 states + fail-closed rule
    │   ├── MATURITY_CLASSIFICATION.json
    │   ├── PROOF_SOURCE_REGISTRY.json
    │   └── services/
    │       ├── council-adapter.js     # quarantine read-only status; assertCouncilQuarantine()
    │       ├── council-service.js     # byte-for-byte import of production council; NOT wired
    │       ├── COUNCIL_ADAPTER_BOUNDARY.md
    │       └── COUNCIL_IMPORT_RECEIPT.json
    ├── deliberation/
    │   ├── validate-deliberation-gate.js # validateDeliberationGate(), appendDeliberationRecord()
    │   └── seed-mission-deliberation.js  # loadMissionDeliberationFile()
    ├── founder-intent/
    │   └── adam-filter.js             # runAdamFilter()
    ├── founder-packet/
    │   └── validate-completeness.js   # validateFounderPacketCompleteness()
    ├── historian/
    │   ├── append-record.js           # appendHistorianRecord(), appendStepExecutionRecord(), summarizeHistorian()
    │   ├── mission-history.js         # summarizeHistory()
    │   ├── record-consensus-session.js
    │   ├── record-decision.js
    │   ├── record-lesson.js
    │   ├── record-outcome.js
    │   └── record-prediction.js
    ├── layout/
    │   ├── repo-layout.js             # detectLayout(), machinePath(), FACTORY_ROOT, REPO_ROOT
    │   └── legacy-write-quarantine.js
    ├── lifeos/
    │   └── c2-surface.js              # getC2SurfaceStatus(), formatC2MissionBrief()
    ├── product-development/
    │   └── validate-gate.js           # validateProductDevelopmentGate()
    ├── readiness/
    │   ├── remote-truth-reconciler.js # reconcileRemoteTruth()
    │   ├── proof-freshness.js
    │   ├── runtime-proof-snapshot.js
    │   ├── structural-proof-freshness.js
    │   ├── system-alpha-readiness.js
    │   └── legacy-quarantine.js
    ├── routes/
    │   ├── factory-execute-step-routes.js   # path: POST /factory/execute-step
    │   └── factory-execute-mission-routes.js # path: POST /factory/execute-mission
    ├── sentry/
    │   ├── verify-step-contract.js    # verifyStepContract() — acceptance tests + sha256
    │   ├── verify-step-result.js      # verifyStepResult(), buildSentryReview()
    │   ├── anti-pattern-check.js      # antiPatternCheck() — 4 forbidden patterns
    │   ├── future-lookback.js         # futureLookbackReview()
    │   ├── unintended-consequence-check.js # unintendedConsequenceCheck()
    │   ├── proof-freshness.js         # checkProofFreshness(), appendSentryReview()
    │   ├── blueprint-freeze-check.js  # blueprintFreezeCheck()
    │   └── run-verification.js
    └── tsos/
        ├── record-step-metrics.js     # recordStepMetrics(), appendStepMetrics()  ← writes JSONL
        ├── tsos-guardrails.js         # validateTsosMetricsEntry(), sanitizeTsosMetricsEntry()
        ├── evaluate-efficiency.js     # evaluateEfficiency()
        ├── tsos-summary.js            # summarizeTsosMetrics()
        ├── cache-value-evaluator.js
        ├── model-routing-evaluator.js
        └── prompt-optimization.js
```

---

## 4. Factory Server Boot (`factory-staging/server.js`)

```js
import express from 'express';
import { registerFactoryRoutes } from './startup/register-routes.js';

const app = express();
app.use(express.json());
registerFactoryRoutes(app);
const port = process.env.FACTORY_PORT || 3099;
app.listen(port);
```

14 lines. No middleware beyond `express.json()`. All routes added by `registerFactoryRoutes(app)`.

---

## 5. Layout Detection (`factory-core/layout/repo-layout.js`)

```js
export const FACTORY_ROOT = path.resolve(LAYOUT_DIR, '../..');
export const REPO_ROOT    = path.resolve(FACTORY_ROOT, '..');

detectLayout(repoRoot) → { mode, missionsRel, machineRel, legacyHost }
```

Two modes:
| Mode | Detected when | `missionsRel` | `machineRel` |
|---|---|---|---|
| `monorepo_legacy` | `server.js` + `builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/BLUEPRINT.json` both exist | `builderos-reboot/MISSIONS` | `builderos-reboot` |
| `standalone` | No `builderos-reboot/`; `missions/FACTORY-REBOOT-0001/BLUEPRINT.json` + `factory-staging/server.js` exist | `missions` | `''` |

Throws if neither layout matches. `REPO_ROOT` is always one directory above `FACTORY_ROOT`.

---

## 6. Factory Routes — Complete Table

Registered by `registerFactoryRoutes(app)` in `factory-staging/startup/register-routes.js`.

| Method | Path | Handler | Returns |
|---|---|---|---|
| GET | `/health` | inline | Service health + all route names |
| POST | `/factory/execute-step` | `dispatchExecuteStep(req.body)` | Step result or blocked-return |
| POST | `/factory/execute-mission` | `dispatchExecuteMission(req.body)` | Mission result or first failure |
| GET | `/factory/council/status` | `assertCouncilQuarantine()` + `getCouncilAdapterStatus()` | Council quarantine status |
| GET | `/factory/readiness` | `READINESS_REPORT.json` + `DETERMINISM_RECEIPT.json` + `reconcileRemoteTruth()` | Readiness report |
| GET | `/factory/mission-history` | `summarizeHistory()` + `summarizeHistorian()` | Mission + historian summary |
| GET | `/factory/historian/summary` | `summarizeHistorian()` | Historian record counts by mission |
| GET | `/factory/tsos/summary` | `summarizeTsosMetrics()` | TSOS metrics summary |
| GET | `/factory/gates/intake?mission_id=X` | `runBpbIntakeGate(mission_id)` | Gate pass/fail + all 5 check results |
| GET | `/factory/c2/status` | `getC2SurfaceStatus()` | C2 surface read |
| GET | `/factory/c2/brief?mission_id=X` | `runBpbIntakeGate()` + `formatC2MissionBrief()` | Mission brief |
| GET | `/factory/truth/reconcile` | `reconcileRemoteTruth()` | Remote truth reconciliation |
| GET | `/factory/canon/status` | checks 3 canon JSON files exist | Canon file existence + maturity rule |

---

## 7. Execute-Step Hot Path — Complete Flow

**Entry:** `POST /factory/execute-step`
**Body:** `{ mission_id, blueprint_id, step, skip_intake_gate?, strict_upstream_gates?, token_cost?, retries?, waste?, model_tier? }`

### Step 1 — Validation
`dispatchExecuteStep(body)` in `factory-core/builder/run-step.js`:
- Requires `step.step_id` and `step.sandbox_boundary` — returns `BLOCKED_RETURN_TO_BPB` (HTTP 422) if missing.

### Step 2 — BPB Intake Gate (unless `skip_intake_gate=true`)
`runBpbIntakeGate(mission_id, { strict_pd })` — see §8. Returns HTTP 422 with `AIC_GATE_FAILURE` if any gate fails.

### Step 3 — Write File Exact
`runWriteFileExact({ mission_id, blueprint_id, step })`:

1. Reject if `step.action_type !== 'write_file_exact'` → `BLOCKED_RETURN_TO_BPB`
2. Reject if `step.target_file` is outside `step.sandbox_boundary` → `BLOCKED_RETURN_TO_BPB`
3. Resolve content:
   - If `exact_inputs.exact_content` set → mode `greenfield`, use literal string
   - If `exact_inputs.content_source_path` set → mode `copy`, read from repo path
   - If neither → `BLOCKED_RETURN_TO_BPB` (missing_requirement)
   - If source file missing → `BLOCKED_RETURN_TO_BPB` (hidden_dependency)
4. `fs.mkdirSync(parentDir, { recursive: true })`
5. `fs.writeFileSync(target, content)`
6. Compute `sha256` of written bytes
7. If `exact_output_contract.type === 'byte_exact_copy'` and sha256 ≠ contract.sha256 → `FAILED_VERIFICATION` (HTTP 409)
8. Return `{ status: 'DONE', sha256, bytes, input_mode, sandbox }` on success

### Step 4 — SENTRY Contract Verify
`verifyStepContract({ mission_id, step, builderResult })`:
- Loads `ACCEPTANCE_TESTS.json` for the mission, filters to this `step_id`
- For `file_sha256_matches` tests: re-reads written file, computes sha256, compares
- For `file_exists` tests: checks file exists
- Also checks `builderResult.status === 'DONE'`
- Returns `{ pass, tests_run, failures[] }`

### Step 5 — SENTRY Result Verify
`verifyStepResult(step, builderResult, { mission_id, contract })` runs 5 sub-checks:
1. `antiPatternCheck({ step, builderResult })` — scans written .js file for 4 forbidden patterns
2. `futureLookbackReview({ step, builderResult })`
3. `unintendedConsequenceCheck({ step, builderResult })`
4. `checkProofFreshness(mission_id)`
5. Contract failures from Step 4

Any blocking failure → `appendSentryReview(review)` + HTTP 409 with `SENTRY_FAILED`.

### Step 6 — TSOS Metrics
`appendStepMetrics({ mission_id, blueprint_id, step_id, target_file, token_cost, latency_ms, retries, waste, bytes_written, input_mode, model_tier })`:
- `validateTsosMetricsEntry(entry)` — rejects forbidden authority fields, requires `step_id`
- `sanitizeTsosMetricsEntry(entry)` — strips any field not in `ALLOWED_METRIC_FIELDS`
- Appends to `factory-staging/data/tsos-step-metrics.jsonl`
- Returns `{ ok, status:'RECORDED', metrics, path }` or `TSOS_GUARDRAIL_VIOLATION` (HTTP 422)
- `evaluateEfficiency({ stepMetrics })` runs after append (measurement only)

### Step 7 — Historian Record
`appendStepExecutionRecord({ mission_id, blueprint_id, step_id, builderResult, sentryReview, tsosResult })`:
- Appends to `factory-staging/data/historian-records.jsonl`
- Record shape: `{ type:'step_execution', mission_id, blueprint_id, step_id, target_file, builder_status, sentry_status, tsos_latency_ms, mission_state:'Verification', trust_level:'outcome-linked', recorded_at }`

### Final — Success Response (HTTP 200)
```json
{
  "ok": true,
  "builder": { "status": "DONE", "sha256": "...", "bytes": N, "input_mode": "copy|greenfield", "sandbox": {...} },
  "sentry": { "implementation_status": "PASS", "step_id": "...", "contract": {...}, "verify": {...}, "review": {...}, "verifyAgainst": ["acceptance_tests","exact_output_contract","anti_pattern_check","future_lookback","proof_freshness"] },
  "tsos": { "ok": true, "status": "RECORDED", "metrics": {...}, "evaluation": {...} },
  "historian": { "recorded": true, "mission_state": "Verification" }
}
```

---

## 8. BPB Intake Gate (`factory-core/bpb/intake-gate.js`)

```js
runBpbIntakeGate(mission_id, { strict_pd=false, skip_if_missing=false, session_id=null })
→ { ok, status:'BPB_INTAKE_PASS'|'AIC_GATE_FAILURE'|'SKIP', mission_id, checks, violations[] }
```

Five checks, in order:
1. **Product Development** — `validateProductDevelopmentGate(product_development, { mission_id, strict })` — reads `PRODUCT_DEVELOPMENT_RESULT.json`
2. **Founder Packet completeness** — `validateFounderPacketCompleteness(founder_packet, { mission_id, strict })` — reads `FOUNDER_PACKET.json`
3. **Adam Filter** — `runAdamFilter({ founder_packet, product_development, strict })` — founder-intent alignment
4. **Blueprint Freeze** — `blueprintFreezeCheck(blueprint)` — reads `BLUEPRINT.json`; checks frozen status
5. **Deliberation Gate** — `validateDeliberationGate(session_id)` — reads `data/deliberation-gate.jsonl` + mission `DELIBERATION.json`

Violations from each check are prefixed: `pd:`, `fp:`, `adam:`, `bpb:`, `delib:`.

```js
validateBlueprintSteps(blueprint)
→ { pass, blocking[] }
```
Required fields per step: `step_id`, `action_type`, `target_file`, `sandbox_boundary`, `authority_owner`.

---

## 9. BLUEPRINT.json Schema (per step)

```json
{
  "mission_id": "FACTORY-REBOOT-0001",
  "blueprint_id": "FACTORY-REBOOT-0001-v2",
  "scope": "bootstrap_repo_and_first_bpb_pack",
  "allowed_action_types": ["write_file_exact"],
  "steps": [
    {
      "step_id": "S001",
      "phase_id": "P0",
      "title": "Human-readable step title",
      "target_file": "builderos-reboot/README.md",
      "action_type": "write_file_exact",
      "exact_inputs": {
        "content_source_path": "builderos-reboot/README.md"
      },
      "exact_output_contract": {
        "type": "byte_exact_copy",
        "sha256": "<sha256-of-expected-output>"
      },
      "allowed_context_files": ["builderos-reboot/README.md"],
      "forbidden_context_files": ["**"],
      "dependencies": [],
      "non_goals": ["Do not add build-system logic."],
      "acceptance_test_ids": ["AT-S001-1"],
      "blocked_return_type_on_failure": "BLOCKED_RETURN_TO_BPB",
      "sandbox_boundary": "builderos-reboot/**",
      "authority_owner": "BPB",
      "on_block": "BLOCKED_RETURN_TO_BPB"
    }
  ]
}
```

**Notes:**
- `exact_inputs` must have either `content_source_path` (reads from repo) or `exact_content` (literal string)
- `sandbox_boundary` enforces write boundary — target must match or be under this path
- `dependencies` is a list of `step_id`s — steps are sorted by topological order before execution
- Circular dependencies throw `Error: Circular dependency at <stepId>`
- Only `write_file_exact` is currently an implemented `action_type`

---

## 10. BLOCKED_RETURN Schema

```js
buildBlockedReturn({ mission_id, blueprint_id, step_id, gap_type, summary, attempted_action, missing_information, evidence })
→ { status:'BLOCKED_RETURN_TO_BPB', mission_id, blueprint_id, step_id, gap_type, summary, attempted_action, missing_information, evidence }
```

`gap_type` values in use: `step_not_deterministic`, `authority_violation`, `missing_requirement`, `hidden_dependency`.

---

## 11. Deliberation Governance v2.7 (`factory-core/canon/deliberation-governance.js`)

`@ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md`

### Constants

```js
VALID_AUTHORITIES = ['ChC','Hist','SNT','CFO','BPB','SDO','CDR']  // 7 departments, hard cap
VALID_REP_CATALOG = ['LifeOS','LimitlessOS','Marketing','Relationship','Health','Founder','Customer','Revenue','Scalability','Privacy','Education']
GRADES = ['A','B','C','D','F']
PROTOCOL_VERSION = 'v2.7'
FUTURE_BACK_HORIZONS = ['1y','2y','4y','5y']
VALID_EVIDENCE_SOURCE_TYPES = ['session_doc','blueprint','commit','external_scan','council_output','manual']
MIN_HIST_CASE_TEXT_CHARS = 20
MAX_REPS_PER_ROSTER = 20
MAX_MODELS_PER_ROSTER = 10
```

### Functions

```js
clampQueryLimit(limit, { min=1, max=200, fallback=50 }) → number
```
Rejects negative/zero/NaN; clamps to [min, max].

```js
validateCnclRoster(roster) → { ok, errors[], roster? }
```
Required: `session_id`. Arrays: `authorities`, `reps`, `models`. Hard rules:
- `authorities.length ≤ 7`
- `reps.length ≤ 20`, `models.length ≤ 10`
- All authorities must be in `VALID_AUTHORITIES`
- All reps must be in `VALID_REP_CATALOG`
- Each model must have `id` or `model`; `focus` if set must be a valid authority
- **BPB + CDR same session:** must have ≥2 models, one with `focus:'BPB'` and one with `focus:'CDR'`, and they must have distinct model ids

```js
validateHistCase(payload) → { ok, errors[] }
```
Required: `session_id`, `case_text` (non-blank, ≥20 chars).

```js
validateCfoReceipt(payload) → { ok, errors[] }
```
Required: `session_id`, `role` or `dept` (≥3 non-whitespace chars). Optional: `tokens` (non-negative integer), `cost_usd` (non-negative number).
**Known bug (N1):** negative `cost_usd` passes validation — `nonNegativeNumberError` only rejects non-finite or < 0, but the check for `cost_usd` returns null when value is null, which allows negative values to slip through certain parse paths.

```js
validateEvidenceVaultEntry(payload) → { ok, errors[] }
```
Required: `source_type` (must be in `VALID_EVIDENCE_SOURCE_TYPES`). `storage_path` must not contain `..` (path traversal guard).

```js
validateConsensusSession(payload) → { ok, errors[] }
```
Required: `session_id`, `final_synthesis` (non-blank string), `participants` (array ≥2), one of `original_positions` (≥1) or `brainstorm_ids` (≥1), `future_back_horizons` (object ≥1 key, keys from `FUTURE_BACK_HORIZONS`), `vote_counts` (object ≥1 key, non-negative integer values).

```js
validateScorecardEntry(payload) → { ok, errors[] }
```
Required: `decision_type`. Optional: `model_count` (non-negative integer), `cost_usd` (non-negative number), `token_count` (non-negative integer), `latency_ms` (non-negative number), `outcome_grade` (must be in `GRADES`).

---

## 12. Deliberation Gate (`factory-core/deliberation/validate-deliberation-gate.js`)

```js
validateDeliberationGate(session_id, { skip_if_missing=false, load_bearing=false })
→ { ok, status:'DELIBERATION_GATE_PASS'|'DELIBERATION_GATE_FAIL'|'SKIP', session_id, load_bearing, hist_case_count, cfo_receipt_count, consensus_session_count, violations[] }
```

**Gate requires:**
- `hist_case_count ≥ 1` → else violation: `HIST_CASE_MISSING`
- `cfo_receipt_count ≥ 1` → else violation: `CFO_RECEIPT_MISSING`
- If `load_bearing=true`: `consensus_session_count ≥ 1` AND `validateConsensusSession()` passes on latest record

**Data source:** `factory-staging/data/deliberation-gate.jsonl` (append-only JSONL) + optional `DELIBERATION.json` in mission pack.

**Session ID resolution:** BPB intake gate passes `session_id = 'mission:' + mission_id`. Gate strips the prefix to locate the mission file.

```js
appendDeliberationRecord(entry)
→ { ok, record }
```
Appends `{ ...entry, recorded_at: ISO_STRING }` to `deliberation-gate.jsonl`.

---

## 13. SENTRY Anti-Pattern Check (`factory-core/sentry/anti-pattern-check.js`)

```js
antiPatternCheck({ step, builderResult, targetContent=null })
→ { step_id, compareAgainst, status:'PASS'|'WARN'|'FAIL', matches[], pass }
```

Four forbidden patterns scanned in written `.js`/`.mjs`/`.cjs` files:
| Pattern | Severity |
|---|---|
| `/\bskip_sentry\s*=\s*true/i` | blocking |
| `/\bFULLY_MACHINE_READY\s*:\s*true/i` | blocking |
| `/\bverdict\s*:\s*['"]STAGING_READY['"]/i` | blocking |
| `/\beval\s*\(/` | blocking |

Any blocking match → `status:'FAIL'`, `pass:false`.
Step allows `invent` or `interpret` in `non_goals` → warning only.

---

## 14. TSOS Guardrails (`factory-core/tsos/tsos-guardrails.js`)

**TSOS = measurement only. Never mission authority.**

```js
ALLOWED_METRIC_FIELDS = new Set([
  'recorded_at','mission_id','blueprint_id','step_id','target_file',
  'token_cost','latency_ms','retries','waste','bytes_written','input_mode',
  'model_tier','cache_hit','prompt_compression_ratio','json_efficiency_score',
  'routing_lane','note'
])

FORBIDDEN_AUTHORITY_FIELDS = new Set([
  'verdict','ready','done','implementation_status','declares_truth',
  'strategy','skip_sentry','skip_verification','lower_scrutiny',
  'mission_authority','staging_ready','fully_machine_ready','approved','consensus'
])
```

```js
validateTsosMetricsEntry(entry) → { ok, violations[] }
```
Rejects any forbidden authority field. Also rejects if `skip_sentry`, `skip_verification`, or `lower_scrutiny` is `true`. Requires `step_id`.

```js
sanitizeTsosMetricsEntry(entry) → object
```
Strips all keys not in `ALLOWED_METRIC_FIELDS`. Non-destructive — does not modify input.

---

## 15. Historian (`factory-core/historian/append-record.js`)

```js
appendHistorianRecord(entry) → { ok, status:'RECORDED'|'HISTORIAN_INVALID', path? }
```
Requires `step_id` OR `type`. Appends `{ ...entry, recorded_at, trust_level:'observed' }` to `factory-staging/data/historian-records.jsonl`.

```js
appendStepExecutionRecord({ mission_id, blueprint_id, step_id, builderResult, sentryReview, tsosResult })
```
Wraps `appendHistorianRecord` with `type:'step_execution'` and `trust_level:'outcome-linked'`.

```js
readHistorianRecords(limit=100) → { count, records[] }
summarizeHistorian() → { total_records, by_mission, last, authority_note }
```
Note: `authority_note = 'Historian records truth and outcomes — never assigns builder work'`.

---

## 16. Council Quarantine Boundary (`factory-core/canon/services/council-adapter.js`)

```js
getCouncilAdapterStatus() → {
  adapter_mode: 'QUARANTINE_READ_ONLY',
  live_wiring: false,
  imported: boolean,         // checks council-service.js file exists
  receipt: object|null,      // reads COUNCIL_IMPORT_RECEIPT.json
  allowed_operations: ['status','health_check'],
  forbidden_operations: ['callCouncilMember','live_dispatch','auto_route']
}
```

```js
assertCouncilQuarantine()
```
Throws if `process.env.COUNCIL_LIVE === '1'` or `COUNCIL_LIVE_WIRING === '1'`. Used as gate on `/factory/council/status`.

The `council-service.js` in `factory-staging/factory-core/canon/services/` is a **byte-for-byte import** of the production council service. It is present for audit purposes only. It must never be called or wired to live endpoints in factory-staging.

---

## 17. Execute-Mission (`factory-core/builder/run-mission.js`)

```js
loadBlueprintFromRepo(missionId)
→ blueprint object | { error:'missing_blueprint', mission_id, path }
```
Uses `detectLayout()` to find `missionsRel`, then reads `<REPO_ROOT>/<missionsRel>/<missionId>/BLUEPRINT.json`.

```js
dispatchExecuteMission(body)
→ { httpStatus, body }
```
- Requires `body.mission_id`
- Loads blueprint, topologically sorts steps
- If `dry_run=true`: returns `SKIPPED_WRITE` for each step without executing
- Iterates steps in dependency order; calls `dispatchExecuteStep()` for each
- First step with `httpStatus !== 200` → immediately returns failure with `failed_at` and partial `results[]`
- All steps pass → `{ ok:true, mission_id, blueprint_id, dry_run, steps_total, results[] }`

**Topological sort** (`sortStepsByDependencies`): DFS; throws on circular dependency. Returns steps in dependency-safe execution order.

---

## 18. Mission State Machine

**File:** `factory-staging/factory-core/canon/MISSION_STATE_MACHINE.json`

```json
{
  "version": "1",
  "states": [
    "Proposed", "Clarified", "Council_Review", "Approved",
    "BPB_Blueprinting", "SENTRY_Review", "Build_Approved",
    "Building", "Verification", "Deployed",
    "Outcome_Measured", "Lessons_Captured"
  ],
  "transitions_fail_closed": true,
  "note": "Every mission receipt must carry mission_state; docs alone do not advance state."
}
```

The `mission_state: 'Verification'` is hardcoded in `appendStepExecutionRecord()` — execution records always write this state.

---

## 19. Data Files — What Lives Where

| File | Path | Written by | Append-only? |
|---|---|---|---|
| Historian records | `factory-staging/data/historian-records.jsonl` | `appendHistorianRecord()` | Yes |
| SENTRY reviews | `factory-staging/data/sentry-reviews.jsonl` | `appendSentryReview()` in sentry/proof-freshness.js | Yes |
| TSOS step metrics | `factory-staging/data/tsos-step-metrics.jsonl` | `appendStepMetrics()` | Yes |
| Deliberation receipts | `factory-staging/data/deliberation-gate.jsonl` | `appendDeliberationRecord()` | Yes |
| Machine state | `builderos-reboot/CURRENT_STATE.json` | Manually updated each session | No |
| Mission queue | `builderos-reboot/MISSION_QUEUE.json` | Manually updated | No |
| Overnight state | `data/governed-autonomy-overnight-state.json` | overnight runner | No |
| Overnight log | `data/governed-autonomy-overnight-log.jsonl` | overnight runner | Yes |

---

## 20. npm factory Scripts

| Script | Command | What it runs |
|---|---|---|
| `factory:ci` | `builderos-reboot/scripts/factory-ci.mjs` | 16/16 CI checks (Neon, GitHub, Railway, missions, SENTRY, TSOS, acceptance, queue) |
| `factory:acceptance` | `builderos-reboot/scripts/run-all-mission-acceptance.mjs` | Acceptance tests for all missions |
| `factory:sentry` | `builderos-reboot/scripts/run-sentry-checks.mjs` | SENTRY mechanical audit |
| `factory:full-loop` | `builderos-reboot/scripts/run-full-loop-proof.mjs` | End-to-end loop proof |
| `factory:certify` | `builderos-reboot/scripts/emit-project-certification.mjs` | Emit certification JSON |
| `factory:tsos` | `builderos-reboot/scripts/factory-tsos-integration.mjs` | TSOS integration test |
| `factory:tools` | `builderos-reboot/scripts/factory-tools-integration.mjs` | Tool matrix check |
| `factory:duplication` | `builderos-reboot/scripts/factory-duplication-test.mjs` | Duplication proof |
| `factory:greenfield:3x` | `builderos-reboot/scripts/run-greenfield-determinism-3x.mjs` | 3× determinism run |
| `factory:determinism` | `builderos-reboot/scripts/run-determinism-mechanical.mjs` | Mechanical determinism receipt |
| `factory:queue:dry-run` | `builderos-reboot/scripts/autopilot-run-queue.mjs` | Dry-run the mission queue |
| `factory:http` | `builderos-reboot/scripts/factory-http-client.mjs` | HTTP client for live factory routes |
| `factory:autopilot` | `builderos-reboot/scripts/autopilot-runner.mjs` | Autopilot runner (dry-run default) |
| `factory:autopilot:execute` | same + `--execute` | Live autopilot execution |

---

## 21. Mission Queue — Current State (2026-06-11)

Source: `builderos-reboot/MISSION_QUEUE.json` + `builderos-reboot/CURRENT_STATE.json`

| Range | Status |
|---|---|
| FACTORY-REBOOT-0001 → 0030 | complete |
| FACTORY-GREENFIELD-0001 | complete |
| FACTORY-PROOF-LOOP-0001 | complete |
| PRODUCT-MARKETINGOS-SALVAGE-0001 | complete (stub) |
| **FACTORY-REBOOT-0031** | queued — department-first routing |
| **FACTORY-DELIBERATION-V27-0001** | wired_uncommitted — needs commit + deploy |
| **PRODUCT-CONVERSATION-COMMITMENTS-C2-0001** | PSSOT complete, BPB → BLUEPRINT next |

`active_mission_id: null` (no mission currently executing).
`certification_ceiling: BOOTSTRAP_AND_STAGING_READY`
`FULLY_MACHINE_READY: false` — deferred until system generates a BP from PSSOT.
`sentry_verdict: SENTRY_MECHANICAL_PASS`

---

## 22. Component Map (Runtime Maturity — as of 2026-05-25)

| Component | ID | Maturity | Proof Source |
|---|---|---|---|
| Builder | `builder` | WIRED + LIVE + PROVEN | `GET /api/v1/lifeos/builder/ready` |
| OIL | `oil` | WIRED + LIVE + PROVEN + **ACTIVE** | Proof freshness CURRENT + Phase14 ALPHA_READY |
| Council AI | `council` | WIRED + LIVE | builder/ready (council dependency live) |
| TSOS internal hooks | `tsos_internal_hooks` | **NOT_WIRED** | No dedicated proof source yet |
| Memory | `memory` | WIRED | `self_repair_memory_events` table exists |
| PB authority | `pb_authority` | WIRED + LIVE + PROVEN | `GET /supervised-autonomy/readiness` |
| Proof freshness | `proof_freshness` | WIRED + LIVE + PROVEN + **ACTIVE** | SHA-aligned |
| Self-repair | `self_repair` | WIRED + LIVE + PROVEN | repair-queue endpoint |
| Prevention | `prevention` | WIRED + LIVE + PROVEN + **ACTIVE** | `GET /prevention/hooks` |
| Telemetry | `telemetry` | WIRED + LIVE + PROVEN + **ACTIVE** | autonomous-telemetry events |
| Overnight runner | `overnight_runner` | WIRED | overnight-state.json (batch 10 healthy_idle) |
| Command Center | `command_center` | WIRED + LIVE + PROVEN | `GET /system-alpha-readiness` 200 |

**Maturity scale:** NOT_WIRED → WIRED → LIVE → PROVEN → ACTIVE

---

## 23. Proof Source Map — 10 Canonical Sources

Only these sources count as runtime proof. Supporting context (docs, manifests, route existence) does NOT raise maturity.

| # | Source | Proves |
|---|---|---|
| 1 | `GET /api/v1/lifeos/builder/ready` | Builder + Council AI live |
| 2 | `GET /api/v1/lifeos/command-center/proof-freshness` | OIL proof freshness, SHA alignment |
| 3 | `GET /api/v1/lifeos/command-center/supervised-autonomy/readiness` | PB authority, repair queue |
| 4 | `GET /api/v1/lifeos/command-center/self-repair/repair-queue` | Open repair count |
| 5 | `GET /api/v1/lifeos/command-center/self-repair/prevention/hooks` | Prevention hook count |
| 6 | `GET /api/v1/lifeos/autonomous-telemetry/efficiency` | avg_useful_work_score |
| 7 | `GET /api/v1/lifeos/autonomous-telemetry/events` | Individual events |
| 8 | `data/governed-autonomy-overnight-state.json` | Overnight batch state |
| 9 | `data/governed-autonomy-overnight-log.jsonl` | Overnight cycle outcomes |
| 10 | `data/builder-continuous-queue-log.jsonl` | Builder queue activity |

---

## 24. Authority Map — One Canonical Path Per Function

| Function | Canonical Path | Service |
|---|---|---|
| Proof refresh | POST /api/v1/gemini/proof → POST /phase14/run-proofs → POST /self-repair/audit/run | `oil-proof-freshness.js` |
| Self-repair authorization | GET /supervised-autonomy/readiness | `pb-execution-authority.js` + `supervised-autonomy-readiness.js` |
| Self-repair execution | POST /api/v1/lifeos/command-center/self-repair/execute | `self-repair-executor.js` |
| Deploy drift detection | POST /api/v1/lifeos/command-center/self-repair/deploy-check | `self-repair-deploy-scheduler.js` |
| Telemetry session | POST /api/v1/lifeos/autonomous-telemetry/session/run | `autonomous-telemetry-session.js` |
| Prevention hooks | GET /api/v1/lifeos/command-center/self-repair/prevention/hooks | `self-repair-prevention-hook-planner.js` |
| Alpha readiness | GET /api/v1/lifeos/command-center/system-alpha-readiness | `builderos-system-alpha-readiness.js` |
| Memory write | services/self-repair-memory.js → `self_repair_memory_events` table | `self-repair-memory.js` |
| Memory read | services/self-repair-memory.js → `readLatestRepairMemory()` | `self-repair-memory.js` |
| Builder execution | POST /api/v1/lifeos/builder/build | managed by Railway council |
| Factory execute step | POST /factory/execute-step | `factory-staging/startup/register-routes.js` |

---

## 25. Self-Repair Loop — 9-Step Chain

1. **Detect** — `services/oil-self-repair-detector.js` → `detectSelfRepairIssues()` — stale proof, SHA drift, OIL missed issues
2. **Classify** — `services/pb-execution-authority.js` → `classifyExecutionAuthority()` — SYSTEM_AUTHORIZED_UNDER_PB or ADAM_REQUIRED
3. **Authorize** — `services/supervised-autonomy-readiness.js` → `buildSupervisedAutonomyReadiness()` — readiness + repair queue + adam_required_actions
4. **Execute** — `services/self-repair-executor.js` → `runSelfRepairExecutor()` — PF-001 → PF-002 → PF-003 chain, max 2 attempts
5. **Log** — `services/self-repair-execution-log.js` → `appendSelfRepairExecutionLog()`
6. **Verify** — `services/oil-proof-freshness.js` → `evaluateProofFreshnessFromPool()` — confirms CURRENT after repair
7. **Receipt** — `services/oil-security-receipts.js` → `writeSecurityReceipt()`
8. **Learn** — `services/self-repair-memory.js` → `writeRepairMemoryFromExecution()`
9. **Prevent** — `services/self-repair-prevention-registry.js` → `buildPreventionRegistry()`

Boot trigger: `startup/boot-domains.js` → `runDeployDriftPreventionHook()` 45s after boot.
Session trigger: `POST /api/v1/lifeos/autonomous-telemetry/session/run` cycle `deploy_prevention_hook`.

---

## 26. Known SENTRY Bugs (Active — repair directions only, not fixed)

| ID | Location | Description | Repair Direction |
|---|---|---|---|
| N1 | `validateCfoReceipt()` | Negative `cost_usd` produces HTTP 500 (PG error) instead of HTTP 400 | Add range check: `n < 0` before DB insert; return 400 with error message; never let `e.message` leak to client |
| N4 | Expand endpoint | Returns 404 on body parse failure (misleading — 404 = not found, not bad input) | Return 422 or 400 on parse failure |
| N5 | `passed_at` | Not stable under concurrent load — COALESCE race condition | Wrap update in `pg_advisory_xact_lock(session_hash)` |
| N8 | Gate PASS without roster | Gate can PASS with no roster on record | Require non-empty roster before allowing PASS |
| N9 | Load-bearing gate PASS without consensus | Confirmed live (sentry-n9-lb-noconsensus session) | Add `load_bearing` flag check to validation path; consensus must be present and valid |
| B_STALE_DEPLOY | Server started 5:28AM; config files modified 10:33AM | All on-disk fixes inactive — running server is reading pre-fix config | Redeploy required to activate any fixes |

---

## 27. Alpha Score Summary (2026-05-25)

| Dimension | Score |
|---|---|
| Loop integrity (40% weight) | 90 / 100 |
| Component maturity (60% weight) | 66.7 / 100 |
| Useful-work bonus (+5% if avg > 0.50) | 0 — NO_DATA |
| **Total** | **76%** |

Active blockers: `TSOS_INTERNAL_HOOKS_NOT_WIRED`, `MEMORY_NOT_RUNTIME_PROVEN`, `USEFUL_WORK_GUARD_COVERAGE_AUDIT_INCOMPLETE`, `TELEMETRY_GAPS_REMAIN`, `LEGACY_AUTHORITY_SURFACES_STILL_LIVE`.

Path to 80%: prove memory (WIRED→LIVE) + wire overnight scheduler (WIRED→ACTIVE) + complete useful-work-guard audit.
Path to Beta: all 5 blockers resolved + overnight runner shows 7 days sustained autonomous useful work.

---

## 28. Fake-Green Risk Register

| Risk | Status |
|---|---|
| Docs claiming more maturity than runtime proves | **Active** |
| Stale proof surfaces (receipt SHA ≠ deployed SHA) | Active — B_STALE_DEPLOY live |
| Duplicate telemetry rows (2 rows per cycle) | Active — Phase A gap |
| Hidden Adam dependency (overnight requires manual C2) | Active |
| Builder `committed:true` with stub output | Fixed 2026-05-25 |
| Hardcoded `usefulWork = 0.321` | Fixed 2026-05-25 — now computed live |
| Legacy fallbacks acting as truth | Active — command-center-routes.js still callable |

---

## 29. Change Receipts

| Date | What | Why |
|---|---|---|
| 2026-05-25 | Original file created | 76% Alpha state verified, 12 components mapped, 10 build phases A-J defined |
| 2026-06-11 | **Full rewrite** — as-built A-to-Z | User directive: blueprint exact enough that any model can replicate the exact system. Added: exact file tree (both layers), complete execute-step hot-path (7 steps), BLUEPRINT.json schema, BLOCKED_RETURN schema, BPB intake gate 5 checks, deliberation governance v2.7 (all functions + constants + constraints), SENTRY anti-pattern 4 patterns, TSOS guardrail allowed/forbidden fields, historian schema, council quarantine boundary, execute-mission flow, mission state machine, data file table, npm factory scripts table, known SENTRY bugs with repair directions, mission queue current state |
