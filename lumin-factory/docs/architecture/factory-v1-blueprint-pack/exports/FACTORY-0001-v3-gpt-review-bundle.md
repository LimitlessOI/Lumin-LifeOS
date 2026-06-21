<!-- SYNOPSIS: FACTORY-0001-v3 GPT Review Bundle -->

# FACTORY-0001-v3 GPT Review Bundle


---

## GPT_REVIEW_PROMPT.md

```md
# GPT Review Prompt

You are acting as `SENTRY` for this blueprint pack.

Your job is to audit this pack for:
- ambiguity
- missing builder constraints
- authority drift
- missing acceptance coverage
- unsafe salvage assumptions
- places where Builder would still need to make decisions

Rules:
- Do not rewrite the architecture from scratch.
- Do not expand scope beyond this proof mission.
- Assume Builder must have zero meaningful discretion.
- Assume BPB is premium reasoning and Builder is lower-cost execution.

Audit questions:
1. Does `BLUEPRINT.json` give Builder enough exact instruction to execute without choosing strategy?
2. Are any steps still too vague or too large?
3. Are the acceptance tests sufficient for this proof mission?
4. Does `AUTHORITY_CHECK.json` adequately prevent Builder discretion?
5. Does `SALVAGE_CANDIDATES.json` identify the right proven old-system parts to reuse?
6. What are the top 5 risks or missing fields?
7. What would you change before freezing this pack?

Files in this pack:
- `FOUNDER_PACKET.md`
- `BLUEPRINT.json`
- `ACCEPTANCE_TESTS.json`
- `AUTHORITY_CHECK.json`
- `SALVAGE_MAP.json`
- `BLOCKED_RETURN_SCHEMA.json`
- `SALVAGE_CANDIDATES.json`

Important:
- `FOUNDER_PACKET.md` is not executable directly.
- `BLUEPRINT.json` is the actual Builder handoff.
- `SALVAGE_CANDIDATES.json` is advisory salvage input discovered from the old system.

```

---

## MANIFEST.md

```md
# Manifest

This export is the external review packet for `FACTORY-0001-v1`.

Use these files:

1. `GPT_REVIEW_PROMPT.md`
2. `FOUNDER_PACKET.md`
3. `FOUNDER_PACKET_COMPLETENESS_CHECKLIST.md`
4. `BLUEPRINT.json`
5. `ACCEPTANCE_TESTS.json`
6. `AUTHORITY_CHECK.json`
7. `SALVAGE_MAP.json`
8. `BLOCKED_RETURN_SCHEMA.json`
9. `../SALVAGE_CANDIDATES.json`

Purpose:
- send to GPT or another external model with no repo access
- have it act as `SENTRY`
- audit the machine-first blueprint pack

```

---

## README.md

```md
# FACTORY-0001-v1

This directory is the exact BPB handoff pack for the first Factory v1 proof mission.

Purpose:
- provide one machine-first blueprint pack that a low-discretion Builder can execute
- provide one pack that GPT and Claude can audit in the SENTRY role
- provide one pack that can be compared against the current BPB output

Execution order:
1. `FOUNDER_PACKET.md`
2. `FOUNDER_PACKET_COMPLETENESS_CHECKLIST.md`
3. `AUTHORITY_CHECK.json`
4. `SALVAGE_MAP.json`
5. `BLOCKED_RETURN_SCHEMA.json`
6. `ACCEPTANCE_TESTS.json`
7. `BLUEPRINT.json`

Builder should consume:
- `BLUEPRINT.json`
- `ACCEPTANCE_TESTS.json`
- `BLOCKED_RETURN_SCHEMA.json`

This pack is not a philosophy document. It is a constrained execution packet for the first proof mission only.

Important distinction:
- `FOUNDER_PACKET.md` is founder intent for this proof mission
- `FOUNDER_PACKET_COMPLETENESS_CHECKLIST.md` is the gate BPB should eventually require before blueprinting larger product missions
- `BLUEPRINT.json` is the actual Builder handoff

Freeze blockers already addressed in this version:
- Builder writes must remain inside `factory-v1/`
- proof execution acceptance tests come from a blueprint-owned registry, not request body
- SENTRY verifies exact file content where blueprint requires exact output

Honest proof-slice naming in this mission:
- Historian is only a receipt recorder
- TSOS is only a metrics recorder

```

---

## FOUNDER_PACKET.md

```md
# Founder Packet

## Mission
Build the minimal Factory v1 execution slice inside the current repo without changing existing product behavior.

## Objective
Prove one end-to-end governed execution path:

Founder Packet
-> BPB handoff pack
-> Builder executes one frozen step
-> SENTRY verifies result
-> Historian records outcome
-> TSOS records metrics

## Required outcome
Create an isolated implementation under `factory-v1/` that exposes one route:

- `POST /api/v1/factory/execute-step`

This route must:
- accept exactly one frozen step object
- execute only the allowed action in that step
- verify the result against blueprint-owned acceptance tests
- record Historian receipt
- record TSOS receipt
- return only `DONE`, `BLOCKED_RETURN_TO_BPB`, or `FAILED_VERIFICATION`

## Hard non-goals
- no autonomous work selection
- no support-task generation
- no fallback generation
- no patch-plan generation
- no self-improvement loop
- no product feature work
- no edits to existing BuilderOS planning logic in this mission

## Constraints
- use ESM
- use ASCII only
- keep new implementation isolated under `factory-v1/`
- all Builder writes must resolve inside `factory-v1/`
- Builder must have zero task discretion
- if spec is insufficient, Builder must return `BLOCKED_RETURN_TO_BPB`
- proof execution acceptance tests must be loaded from a blueprint-owned local registry, not caller input

## Honest proof-slice naming
For this proof mission only:
- Historian capability is limited to receipt recording
- TSOS capability is limited to metrics recording

## Definition of done
Mission is done only when a sample frozen step can pass through the full route and produce:
- Builder result
- SENTRY verification result
- Historian receipt
- TSOS receipt
- exact output file content equal to blueprint-required content

```

---

## FOUNDER_PACKET_COMPLETENESS_CHECKLIST.md

```md
# Founder Packet Completeness Checklist

## Purpose

This checklist exists to prevent strategic ambiguity from being pushed downward into BPB or Builder.

Rule:
- if Founder Packet ambiguity is strategic, BPB must not guess
- if BPB encounters unresolved strategic ambiguity, return to Product Development
- if Builder encounters ambiguity, return to BPB

Strategic ambiguity may never be pushed into execution.

## Law

Founder Packet Completeness Law:

The Founder Packet must resolve all foreseeable strategic, priority, scope, tradeoff, success, and mission-boundary questions before BPB begins blueprinting.

If BPB encounters unresolved strategic ambiguity:
- `RETURN_TO_PRODUCT_DEVELOPMENT`

If Builder encounters ambiguity:
- `RETURN_TO_BPB`

## Required gates before BPB begins

### 1. Mission Clarity
- What mission is being pursued?
- What problem is being solved?
- Why does this mission exist now?
- What outcome is required?

### 2. Priority Clarity
- Why this mission instead of other candidate missions?
- What higher-priority work is intentionally deferred?
- What opportunity cost is being accepted?

### 3. Scope Clarity
- What is in scope?
- What is explicitly out of scope?
- What is deferred to later phases?

### 4. Success Criteria
- What counts as success?
- What counts as failure?
- How will alpha be judged?
- Who judges alpha success?

### 5. Tradeoff Boundaries
- What sacrifices are acceptable?
- What may be optimized for speed?
- What may not be traded away?
- What must be preserved even if slower or more expensive?

### 6. Authority Boundaries
- What may BPB decide without founder escalation?
- What may AIC decide without founder escalation?
- What requires founder decision?
- What requires Sherry review?

### 7. Multiple-Valid-Path Rule
- If more than one valid path exists, what decision rule should BPB use?
- Is reuse preferred over rewrite?
- Is lower risk preferred over higher speed?
- Is stronger determinism preferred over short-term convenience?

### 8. Escalation Boundaries
- What types of issues may return to founder?
- What types must remain inside AIC/BPB?
- What type of outage triggers C2 critical escalation?

### 9. Resource Constraints
- Time limit
- Budget limit
- token sensitivity
- founder attention sensitivity
- deployment/platform constraints

### 10. Existing Asset Review
- What already exists that should be considered?
- What proven system parts should be reused?
- What old parts are forbidden because they caused drift?

## BPB start condition

BPB may begin only when all sections above are answered well enough that:
- BPB does not need to invent strategy
- BPB does not need to invent priorities
- BPB does not need to invent tradeoffs
- Builder will not receive strategic ambiguity

## Determinism test

Before freeze, the BP should be tested by multiple strong agents.

Question:
- "What exactly gets built?"

If answers differ materially:
- BP failed
- not Builder

## Honest note for FACTORY-0001

FACTORY-0001 proves the minimal governed execution path.

It does not yet prove the full:
- Founder
- Product Development
- AIC
- BPB
- Freeze

pipeline for large product missions.

That is the next layer this checklist is meant to support.

```

---

## BLUEPRINT.json

```json
{
  "mission_id": "FACTORY-0001",
  "blueprint_id": "FACTORY-0001-v1",
  "version": 1,
  "root_path": "factory-v1",
  "goal": "Create the minimal governed execute-step path with Builder, SENTRY, Historian, and TSOS under an isolated factory-v1 directory.",
  "sandbox_root": "factory-v1",
  "proof_execution_acceptance_source": "blueprint_owned_registry_only",
  "allowed_builder_step_types": [
    "write_file_exact",
    "append_file_exact",
    "replace_file_exact"
  ],
  "steps": [
    {
      "step_id": "S001",
      "phase_id": "P1",
      "title": "Create blocked return contract",
      "type": "write_file_exact",
      "target_file": "factory-v1/contracts/BLOCKED_RETURN_SCHEMA.json",
      "depends_on": [],
      "salvage_from": [],
      "content": "{\n  \"status\": \"BLOCKED_RETURN_TO_BPB\",\n  \"required_fields\": [\n    \"status\",\n    \"mission_id\",\n    \"blueprint_id\",\n    \"step_id\",\n    \"gap_type\",\n    \"summary\",\n    \"attempted_action\",\n    \"missing_information\",\n    \"evidence\"\n  ],\n  \"allowed_gap_type_values\": [\n    \"ambiguous_spec\",\n    \"missing_dependency\",\n    \"conflicting_instruction\",\n    \"forbidden_action_required\",\n    \"external_failure\",\n    \"schema_invalid\"\n  ]\n}\n",
      "required_fields": [
        "status",
        "required_fields",
        "allowed_gap_type_values"
      ],
      "non_goals": [
        "Do not add extra statuses",
        "Do not add comments"
      ],
      "acceptance_test_ids": [
        "AT-S001-1",
        "AT-S001-2"
      ],
      "on_block": "RETURN_TO_BPB"
    },
    {
      "step_id": "S002",
      "phase_id": "P2",
      "title": "Create SENTRY verifier",
      "type": "write_file_exact",
      "target_file": "factory-v1/sentry/verify-step-result.js",
      "depends_on": [
        "S001"
      ],
      "salvage_from": [],
      "content": "import { readFile } from 'node:fs/promises';\nimport { execSync } from 'node:child_process';\n\nasync function runTest(test) {\n  if (test.type === 'file_exists') {\n    await readFile(test.target, 'utf8');\n    return true;\n  }\n\n  if (test.type === 'json_parseable') {\n    const content = await readFile(test.target, 'utf8');\n    JSON.parse(content);\n    return true;\n  }\n\n  if (test.type === 'file_contains_string') {\n    const content = await readFile(test.target, 'utf8');\n    return content.includes(test.expected);\n  }\n\n  if (test.type === 'file_contains_export') {\n    const content = await readFile(test.target, 'utf8');\n    return content.includes(`export ${test.expected}`) || content.includes(`export async function ${test.expected}`) || content.includes(`export function ${test.expected}`);\n  }\n\n  if (test.type === 'file_exact_match') {\n    const content = await readFile(test.target, 'utf8');\n    return content === test.expected;\n  }\n\n  if (test.type === 'node_check') {\n    try {\n      execSync(`node --check ${JSON.stringify(test.target)}`, { stdio: 'pipe' });\n      return true;\n    } catch {\n      return false;\n    }\n  }\n\n  throw new Error(`UNSUPPORTED_TEST_TYPE:${test.type}`);\n}\n\nexport async function verifyStepResult(result, acceptanceTests) {\n  const failedTestIds = [];\n\n  for (const test of acceptanceTests) {\n    const passed = await runTest(test);\n    if (!passed) {\n      failedTestIds.push(test.test_id);\n    }\n  }\n\n  return {\n    status: failedTestIds.length === 0 ? 'VERIFIED' : 'FAILED_VERIFICATION',\n    passed: failedTestIds.length === 0,\n    failed_test_ids: failedTestIds,\n    builder_result: result\n  };\n}\n",
      "required_exports": [
        "verifyStepResult"
      ],
      "non_goals": [
        "Do not implement network checks",
        "Do not mutate blueprint",
        "Do not add task selection"
      ],
      "acceptance_test_ids": [
        "AT-S002-1",
        "AT-S002-2",
        "AT-S002-3",
        "AT-S002-4"
      ],
      "on_block": "RETURN_TO_BPB"
    },
    {
      "step_id": "S003",
      "phase_id": "P2",
      "title": "Create Historian receipt recorder",
      "type": "write_file_exact",
      "target_file": "factory-v1/historian/record-step-outcome.js",
      "depends_on": [],
      "salvage_from": [],
      "content": "const REQUIRED_FIELDS = ['mission_id', 'blueprint_id', 'step_id', 'builder_status', 'verifier_status', 'timestamp'];\n\nexport async function recordStepOutcome(receipt) {\n  for (const field of REQUIRED_FIELDS) {\n    if (!(field in receipt)) {\n      throw new Error(`MISSING_RECEIPT_FIELD:${field}`);\n    }\n  }\n\n  return receipt;\n}\n",
      "required_exports": [
        "recordStepOutcome"
      ],
      "non_goals": [
        "Do not persist to database",
        "Do not write files",
        "Do not synthesize lessons"
      ],
      "acceptance_test_ids": [
        "AT-S003-1",
        "AT-S003-2"
      ],
      "on_block": "RETURN_TO_BPB"
    },
    {
      "step_id": "S004",
      "phase_id": "P2",
      "title": "Create TSOS metrics recorder",
      "type": "write_file_exact",
      "target_file": "factory-v1/tsos/record-step-metrics.js",
      "depends_on": [],
      "salvage_from": [],
      "content": "const REQUIRED_FIELDS = ['mission_id', 'blueprint_id', 'step_id', 'status', 'started_at', 'finished_at'];\n\nexport async function recordStepMetrics(metrics) {\n  for (const field of REQUIRED_FIELDS) {\n    if (!(field in metrics)) {\n      throw new Error(`MISSING_METRICS_FIELD:${field}`);\n    }\n  }\n\n  return {\n    ...metrics,\n    duration_ms: new Date(metrics.finished_at).getTime() - new Date(metrics.started_at).getTime()\n  };\n}\n",
      "required_exports": [
        "recordStepMetrics"
      ],
      "non_goals": [
        "Do not persist metrics",
        "Do not estimate tokens",
        "Do not aggregate metrics"
      ],
      "acceptance_test_ids": [
        "AT-S004-1",
        "AT-S004-2"
      ],
      "on_block": "RETURN_TO_BPB"
    },
    {
      "step_id": "S005",
      "phase_id": "P3",
      "title": "Create Builder executeStep runtime",
      "type": "write_file_exact",
      "target_file": "factory-v1/builder/execute-step.js",
      "depends_on": [
        "S001"
      ],
      "salvage_from": [],
      "content": "import { appendFile, readFile, writeFile } from 'node:fs/promises';\nimport { resolve, sep } from 'node:path';\n\nconst SANDBOX_ROOT = resolve(process.cwd(), 'factory-v1');\n\nfunction blocked(step, summary, missingInformation, evidence) {\n  return {\n    status: 'BLOCKED_RETURN_TO_BPB',\n    mission_id: step?.mission_id || null,\n    blueprint_id: step?.blueprint_id || null,\n    step_id: step?.step_id || null,\n    gap_type: 'ambiguous_spec',\n    summary,\n    attempted_action: 'execute_step',\n    missing_information: missingInformation,\n    evidence\n  };\n}\n\nfunction resolveSandboxedPath(targetFile) {\n  const resolved = resolve(process.cwd(), targetFile);\n  if (!(resolved === SANDBOX_ROOT || resolved.startsWith(`${SANDBOX_ROOT}${sep}`))) {\n    const error = new Error(`Target outside factory sandbox: ${targetFile}`);\n    error.code = 'MISSION_VIOLATION';\n    throw error;\n  }\n  return resolved;\n}\n\nexport async function executeStep(step) {\n  if (!step || !step.type || !step.target_file) {\n    return blocked(step, 'Missing required step fields.', ['type', 'target_file'], ['Step payload missing required execution fields.']);\n  }\n\n  const targetPath = resolveSandboxedPath(step.target_file);\n\n  if (step.type === 'write_file_exact') {\n    if (typeof step.content !== 'string') {\n      return blocked(step, 'write_file_exact requires string content.', ['content'], ['step.content was not provided as a string.']);\n    }\n    await writeFile(targetPath, step.content, 'utf8');\n    return { status: 'DONE', target_file: step.target_file };\n  }\n\n  if (step.type === 'append_file_exact') {\n    if (typeof step.content !== 'string') {\n      return blocked(step, 'append_file_exact requires string content.', ['content'], ['step.content was not provided as a string.']);\n    }\n    await appendFile(targetPath, step.content, 'utf8');\n    return { status: 'DONE', target_file: step.target_file };\n  }\n\n  if (step.type === 'replace_file_exact') {\n    if (typeof step.find !== 'string' || typeof step.replace !== 'string') {\n      return blocked(step, 'replace_file_exact requires string find and replace fields.', ['find', 'replace'], ['step.find or step.replace was not provided as a string.']);\n    }\n    const original = await readFile(targetPath, 'utf8');\n    if (!original.includes(step.find)) {\n      return blocked(step, 'replace_file_exact could not find target string.', ['find must exist in target_file'], ['Specified find string was not present in target file.']);\n    }\n    await writeFile(targetPath, original.split(step.find).join(step.replace), 'utf8');\n    return { status: 'DONE', target_file: step.target_file };\n  }\n\n  const error = new Error(`Unsupported builder action: ${step.type}`);\n  error.code = 'MISSION_VIOLATION';\n  throw error;\n}\n",
      "required_exports": [
        "executeStep"
      ],
      "non_goals": [
        "Do not choose another step",
        "Do not retry automatically",
        "Do not create support files",
        "Do not orchestrate multiple steps"
      ],
      "acceptance_test_ids": [
        "AT-S005-1",
        "AT-S005-2",
        "AT-S005-3",
        "AT-S005-4",
        "AT-S005-5"
      ],
      "on_block": "RETURN_TO_BPB"
    },
    {
      "step_id": "S006",
      "phase_id": "P3",
      "title": "Create frozen-step runner",
      "type": "write_file_exact",
      "target_file": "factory-v1/runtime/run-frozen-step.js",
      "depends_on": [
        "S002",
        "S003",
        "S004",
        "S005"
      ],
      "salvage_from": [],
      "content": "import { executeStep } from '../builder/execute-step.js';\nimport { verifyStepResult } from '../sentry/verify-step-result.js';\nimport { recordStepOutcome } from '../historian/record-step-outcome.js';\nimport { recordStepMetrics } from '../tsos/record-step-metrics.js';\n\nexport async function runFrozenStep({ step, acceptanceTests }) {\n  const startedAt = new Date().toISOString();\n  const builder = await executeStep(step);\n  const finishedAt = new Date().toISOString();\n\n  const verifier = builder.status === 'BLOCKED_RETURN_TO_BPB'\n    ? { status: 'SKIPPED_VERIFICATION', passed: false, failed_test_ids: [] }\n    : await verifyStepResult(builder, acceptanceTests);\n\n  const historian = await recordStepOutcome({\n    mission_id: step.mission_id,\n    blueprint_id: step.blueprint_id,\n    step_id: step.step_id,\n    builder_status: builder.status,\n    verifier_status: verifier.status,\n    timestamp: finishedAt\n  });\n\n  const tsos = await recordStepMetrics({\n    mission_id: step.mission_id,\n    blueprint_id: step.blueprint_id,\n    step_id: step.step_id,\n    status: verifier.status === 'FAILED_VERIFICATION' ? 'FAILED_VERIFICATION' : builder.status,\n    started_at: startedAt,\n    finished_at: finishedAt\n  });\n\n  return {\n    status: verifier.status === 'FAILED_VERIFICATION' ? 'FAILED_VERIFICATION' : builder.status,\n    builder,\n    verifier,\n    historian,\n    tsos\n  };\n}\n",
      "required_exports": [
        "runFrozenStep"
      ],
      "non_goals": [
        "Do not add queue logic",
        "Do not call BPB",
        "Do not persist receipts"
      ],
      "acceptance_test_ids": [
        "AT-S006-1",
        "AT-S006-2"
      ],
      "on_block": "RETURN_TO_BPB"
    },
    {
      "step_id": "S007",
      "phase_id": "P4",
      "title": "Create execute-step route",
      "type": "write_file_exact",
      "target_file": "factory-v1/routes/factory-execute-step-routes.js",
      "depends_on": [
        "S006"
      ],
      "salvage_from": [],
      "content": "import express from 'express';\nimport acceptanceRegistry from '../contracts/acceptance-tests-registry.json' with { type: 'json' };\nimport { runFrozenStep } from '../runtime/run-frozen-step.js';\n\nexport function createFactoryExecuteStepRoutes() {\n  const router = express.Router();\n\n  router.post('/execute-step', async (req, res, next) => {\n    try {\n      const { step } = req.body || {};\n      if (!step || !step.step_id) {\n        return res.status(400).json({\n          status: 'BLOCKED_RETURN_TO_BPB',\n          summary: 'Request body must include a step with step_id.'\n        });\n      }\n\n      const acceptanceTests = acceptanceRegistry.tests.filter((test) => test.step_id === step.step_id);\n      if (acceptanceTests.length === 0) {\n        return res.status(400).json({\n          status: 'BLOCKED_RETURN_TO_BPB',\n          summary: 'No blueprint-owned acceptance tests found for step.'\n        });\n      }\n\n      const result = await runFrozenStep({ step, acceptanceTests });\n      return res.json(result);\n    } catch (error) {\n      return next(error);\n    }\n  });\n\n  return router;\n}\n",
      "required_exports": [
        "createFactoryExecuteStepRoutes"
      ],
      "non_goals": [
        "Do not mount the router",
        "Do not add unrelated endpoints",
        "Do not add authentication"
      ],
      "acceptance_test_ids": [
        "AT-S007-1",
        "AT-S007-2",
        "AT-S007-3",
        "AT-S007-4"
      ],
      "on_block": "RETURN_TO_BPB"
    },
    {
      "step_id": "S008",
      "phase_id": "P5",
      "title": "Create sample frozen step payload",
      "type": "write_file_exact",
      "target_file": "factory-v1/examples/sample-frozen-step.json",
      "depends_on": [],
      "salvage_from": [],
      "content": "{\n  \"mission_id\": \"FACTORY-0001\",\n  \"blueprint_id\": \"FACTORY-0001-v1\",\n  \"step_id\": \"EXAMPLE-001\",\n  \"type\": \"write_file_exact\",\n  \"target_file\": \"factory-v1/tmp/proof-output.txt\",\n  \"content\": \"proof mission output\\n\"\n}\n",
      "required_fields": [
        "mission_id",
        "blueprint_id",
        "step_id",
        "type",
        "target_file",
        "content"
      ],
      "non_goals": [
        "Do not create extra example payloads"
      ],
      "acceptance_test_ids": [
        "AT-S008-1",
        "AT-S008-2",
        "AT-S008-3"
      ],
      "on_block": "RETURN_TO_BPB"
    },
    {
      "step_id": "S009",
      "phase_id": "P5",
      "title": "Create blueprint-owned acceptance registry for proof execution",
      "type": "write_file_exact",
      "target_file": "factory-v1/contracts/acceptance-tests-registry.json",
      "depends_on": [
        "S008"
      ],
      "salvage_from": [],
      "content": "{\n  \"tests\": [\n    {\n      \"test_id\": \"PROOF-001\",\n      \"step_id\": \"EXAMPLE-001\",\n      \"type\": \"file_exists\",\n      \"target\": \"factory-v1/tmp/proof-output.txt\"\n    },\n    {\n      \"test_id\": \"PROOF-002\",\n      \"step_id\": \"EXAMPLE-001\",\n      \"type\": \"file_exact_match\",\n      \"target\": \"factory-v1/tmp/proof-output.txt\",\n      \"expected\": \"proof mission output\\n\"\n    }\n  ]\n}\n",
      "required_fields": [
        "tests"
      ],
      "non_goals": [
        "Do not accept caller-supplied acceptance tests",
        "Do not add unrelated proof cases"
      ],
      "acceptance_test_ids": [
        "AT-S009-1",
        "AT-S009-2"
      ],
      "on_block": "RETURN_TO_BPB"
    }
  ]
}

```

---

## ACCEPTANCE_TESTS.json

```json
{
  "mission_id": "FACTORY-0001",
  "blueprint_id": "FACTORY-0001-v1",
  "tests": [
    {
      "test_id": "AT-S001-1",
      "step_id": "S001",
      "type": "json_parseable",
      "target": "factory-v1/contracts/BLOCKED_RETURN_SCHEMA.json"
    },
    {
      "test_id": "AT-S001-2",
      "step_id": "S001",
      "type": "file_contains_string",
      "target": "factory-v1/contracts/BLOCKED_RETURN_SCHEMA.json",
      "expected": "BLOCKED_RETURN_TO_BPB"
    },
    {
      "test_id": "AT-S002-1",
      "step_id": "S002",
      "type": "node_check",
      "target": "factory-v1/sentry/verify-step-result.js"
    },
    {
      "test_id": "AT-S002-2",
      "step_id": "S002",
      "type": "file_contains_export",
      "target": "factory-v1/sentry/verify-step-result.js",
      "expected": "verifyStepResult"
    },
    {
      "test_id": "AT-S002-3",
      "step_id": "S002",
      "type": "file_contains_string",
      "target": "factory-v1/sentry/verify-step-result.js",
      "expected": "FAILED_VERIFICATION"
    },
    {
      "test_id": "AT-S002-4",
      "step_id": "S002",
      "type": "file_contains_string",
      "target": "factory-v1/sentry/verify-step-result.js",
      "expected": "file_exact_match"
    },
    {
      "test_id": "AT-S003-1",
      "step_id": "S003",
      "type": "node_check",
      "target": "factory-v1/historian/record-step-outcome.js"
    },
    {
      "test_id": "AT-S003-2",
      "step_id": "S003",
      "type": "file_contains_export",
      "target": "factory-v1/historian/record-step-outcome.js",
      "expected": "recordStepOutcome"
    },
    {
      "test_id": "AT-S004-1",
      "step_id": "S004",
      "type": "node_check",
      "target": "factory-v1/tsos/record-step-metrics.js"
    },
    {
      "test_id": "AT-S004-2",
      "step_id": "S004",
      "type": "file_contains_export",
      "target": "factory-v1/tsos/record-step-metrics.js",
      "expected": "recordStepMetrics"
    },
    {
      "test_id": "AT-S005-1",
      "step_id": "S005",
      "type": "node_check",
      "target": "factory-v1/builder/execute-step.js"
    },
    {
      "test_id": "AT-S005-2",
      "step_id": "S005",
      "type": "file_contains_export",
      "target": "factory-v1/builder/execute-step.js",
      "expected": "executeStep"
    },
    {
      "test_id": "AT-S005-3",
      "step_id": "S005",
      "type": "file_contains_string",
      "target": "factory-v1/builder/execute-step.js",
      "expected": "MISSION_VIOLATION"
    },
    {
      "test_id": "AT-S005-4",
      "step_id": "S005",
      "type": "file_contains_string",
      "target": "factory-v1/builder/execute-step.js",
      "expected": "BLOCKED_RETURN_TO_BPB"
    },
    {
      "test_id": "AT-S005-5",
      "step_id": "S005",
      "type": "file_contains_string",
      "target": "factory-v1/builder/execute-step.js",
      "expected": "factory-v1"
    },
    {
      "test_id": "AT-S006-1",
      "step_id": "S006",
      "type": "node_check",
      "target": "factory-v1/runtime/run-frozen-step.js"
    },
    {
      "test_id": "AT-S006-2",
      "step_id": "S006",
      "type": "file_contains_export",
      "target": "factory-v1/runtime/run-frozen-step.js",
      "expected": "runFrozenStep"
    },
    {
      "test_id": "AT-S007-1",
      "step_id": "S007",
      "type": "node_check",
      "target": "factory-v1/routes/factory-execute-step-routes.js"
    },
    {
      "test_id": "AT-S007-2",
      "step_id": "S007",
      "type": "file_contains_export",
      "target": "factory-v1/routes/factory-execute-step-routes.js",
      "expected": "createFactoryExecuteStepRoutes"
    },
    {
      "test_id": "AT-S007-3",
      "step_id": "S007",
      "type": "file_contains_string",
      "target": "factory-v1/routes/factory-execute-step-routes.js",
      "expected": "/execute-step"
    },
    {
      "test_id": "AT-S007-4",
      "step_id": "S007",
      "type": "file_contains_string",
      "target": "factory-v1/routes/factory-execute-step-routes.js",
      "expected": "acceptance-tests-registry.json"
    },
    {
      "test_id": "AT-S008-1",
      "step_id": "S008",
      "type": "json_parseable",
      "target": "factory-v1/examples/sample-frozen-step.json"
    },
    {
      "test_id": "AT-S008-2",
      "step_id": "S008",
      "type": "json_parseable",
      "target": "factory-v1/examples/sample-frozen-step.json"
    },
    {
      "test_id": "AT-S008-3",
      "step_id": "S008",
      "type": "file_contains_string",
      "target": "factory-v1/examples/sample-frozen-step.json",
      "expected": "\"type\": \"write_file_exact\""
    },
    {
      "test_id": "AT-S009-1",
      "step_id": "S009",
      "type": "json_parseable",
      "target": "factory-v1/contracts/acceptance-tests-registry.json"
    },
    {
      "test_id": "AT-S009-2",
      "step_id": "S009",
      "type": "file_contains_string",
      "target": "factory-v1/contracts/acceptance-tests-registry.json",
      "expected": "file_exact_match"
    }
  ]
}

```

---

## AUTHORITY_CHECK.json

```json
{
  "mission_id": "FACTORY-0001",
  "blueprint_id": "FACTORY-0001-v1",
  "roles": {
    "Founder": {
      "may": [
        "define_mission",
        "define_success_criteria",
        "approve_scope"
      ],
      "may_not": [
        "execute_builder_step"
      ]
    },
    "AIC": {
      "may": [
        "challenge_founder_packet",
        "approve_bpb_input"
      ],
      "may_not": [
        "write_runtime_files",
        "execute_builder_step"
      ]
    },
    "BPB": {
      "may": [
        "author_blueprint",
        "author_acceptance_tests",
        "author_blocked_return_contract",
        "author_salvage_map"
      ],
      "may_not": [
        "execute_builder_step"
      ]
    },
    "Builder": {
      "may": [
        "execute_exact_step",
        "return_done",
        "return_blocked",
        "return_failed_verification"
      ],
      "may_not": [
        "select_task",
        "prioritize_task",
        "create_support_task",
        "create_fallback_task",
        "create_patch_plan",
        "modify_blueprint",
        "modify_authority_rules",
        "modify_canonical_memory"
      ]
    },
    "SENTRY": {
      "may": [
        "verify_step_output",
        "reject_failed_output",
        "suspend_trust_on_failed_check"
      ],
      "may_not": [
        "author_blueprint",
        "execute_builder_step"
      ]
    },
    "Historian": {
      "may": [
        "record_step_receipt"
      ],
      "may_not": [
        "change_builder_output"
      ]
    },
    "TSOS": {
      "may": [
        "record_step_metrics"
      ],
      "may_not": [
        "change_builder_output",
        "change_blueprint"
      ]
    }
  },
  "builder_api_forbidden_capabilities": [
    "task_selection",
    "priority_selection",
    "support_task_creation",
    "fallback_generation",
    "patch_plan_creation",
    "multi_step_orchestration"
  ],
  "enforcement_requirements": {
    "sandbox_root": "factory-v1",
    "proof_execution_acceptance_source": "blueprint_owned_registry_only",
    "exact_write_validation_required": true
  }
}

```

---

## SALVAGE_MAP.json

```json
{
  "mission_id": "FACTORY-0001",
  "blueprint_id": "FACTORY-0001-v1",
  "policy": "no_salvage_for_proof_mission",
  "entries": [],
  "notes": [
    "This first proof mission intentionally avoids reusing old builder logic.",
    "The goal is to prove the minimal governed execution path in isolation."
  ]
}

```

---

## BLOCKED_RETURN_SCHEMA.json

```json
{
  "status": "BLOCKED_RETURN_TO_BPB",
  "required_fields": [
    "status",
    "mission_id",
    "blueprint_id",
    "step_id",
    "gap_type",
    "summary",
    "attempted_action",
    "missing_information",
    "evidence"
  ],
  "allowed_gap_type_values": [
    "ambiguous_spec",
    "missing_dependency",
    "conflicting_instruction",
    "forbidden_action_required",
    "external_failure",
    "schema_invalid"
  ]
}

```

---

## SALVAGE_CANDIDATES.json

```json
{
  "audit_date": "2026-06-03",
  "auditor": "Claude Code (SENTRY pass)",
  "scope": "factory_only",
  "note": "This file covers only what the factory itself needs to run. Product salvage (LifeOS routes, overlays, feature services) belongs in a separate PRODUCT_SALVAGE_CANDIDATES.json written when BPB blueprints the first product mission.",

  "factory_salvage": [
    {
      "file": "startup/database.js",
      "what": "Neon connection pool + migration auto-runner. Reads db/migrations/*.sql alphabetically, tracks applied in schema_migrations table, applies new ones at boot.",
      "why_factory_needs_it": "Nothing runs without DB. Migration runner means new factory migrations apply automatically on deploy.",
      "reuse_value": 10,
      "proof": "confirmed_live",
      "adaptation_cost": "none",
      "salvage_type": "import_as_is"
    },
    {
      "file": "services/council-service.js",
      "what": "Multi-model AI call engine. 2052 lines. Calls Gemini Flash, Claude via OpenRouter, Groq Llama, DeepSeek. Handles failover, retry, 413 PROMPT_TOO_LARGE fast-fail, token logging.",
      "why_factory_needs_it": "AIC runs on this. BPB sessions run on this. 12+ months of model-calling lessons are encoded in it. The hardest thing to rebuild.",
      "reuse_value": 10,
      "proof": "confirmed_live",
      "adaptation_cost": "none",
      "salvage_type": "import_as_is"
    },
    {
      "file": "services/deployment-service.js",
      "what": "commitToGitHub(), triggerDeployment(). 379 lines.",
      "why_factory_needs_it": "How Builder commits output from Railway to GitHub. Without this, Builder output never persists.",
      "reuse_value": 10,
      "proof": "confirmed_live",
      "adaptation_cost": "none",
      "salvage_type": "import_as_is"
    },
    {
      "file": "services/railway-managed-env-service.js + routes/railway-managed-env-routes.js",
      "what": "GET/SET Railway env vars via API. 636 + 588 lines.",
      "why_factory_needs_it": "How the factory manages its own configuration without touching the Railway UI. 107 vars already set.",
      "reuse_value": 9,
      "proof": "confirmed_live",
      "adaptation_cost": "none",
      "salvage_type": "import_as_is"
    },
    {
      "file": "scripts/builderos-groq-antipattern-scan.mjs",
      "what": "12 confirmed failure patterns from production: asyncFn hallucination, wrong import paths, CommonJS bleed in ESM, markdown fences in JS, partial-edit corruption, import-merge bug, and more. 152 lines.",
      "why_factory_needs_it": "This is OIL's executable knowledge. Each pattern is a real failure that happened. Import into factory-v1/oil/.",
      "reuse_value": 10,
      "proof": "confirmed_live",
      "adaptation_cost": "none",
      "salvage_type": "import_as_is"
    },
    {
      "file": "scripts/verify-builder-output.mjs",
      "what": "Stub detection: line-count collapse, stub content markers, comment ellipsis, empty export bodies. 163 lines.",
      "why_factory_needs_it": "SENTRY uses this to catch truncated or empty builder output before it gets committed.",
      "reuse_value": 9,
      "proof": "confirmed_live",
      "adaptation_cost": "none",
      "salvage_type": "import_as_is"
    },
    {
      "file": "services/builderos-patch-mode-policy.js",
      "what": "Zone 1/2/3 classification by file size and path. 144 lines.",
      "why_factory_needs_it": "BPB needs to know if a target file is safe for full-file generation or requires patch mode. This is the classification logic.",
      "reuse_value": 7,
      "proof": "confirmed_live",
      "adaptation_cost": "none",
      "salvage_type": "import_as_is"
    },
    {
      "file": "routes/lifeos-council-builder-routes.js",
      "what": "POST /builder/build, /builder/execute, /builder/ready, /builder/domains, /builder/history. 2103 lines.",
      "why_factory_needs_it": "The HTTP surface that Builder calls to generate and commit output. The validation gates (validateGeneratedOutputForTarget), Zone enforcement, and commitToGitHub path are all real and working.",
      "reuse_value": 8,
      "proof": "confirmed_live",
      "adaptation_cost": "medium",
      "salvage_type": "adapt_and_import",
      "adaptation_note": "Extract the HTTP+validation+commit path. Remove the embedded runner/queue decision logic. The runner (governed-overnight-backlog-run.mjs) is what gets removed, not this file."
    },
    {
      "file": "scripts/council-builder-preflight.mjs",
      "what": "Preflight: verifies builder reachable, key matches, GitHub token live, domains endpoint returns 200. 378 lines.",
      "why_factory_needs_it": "Factory should always run preflight before Builder executes. This is the check.",
      "reuse_value": 8,
      "proof": "confirmed_live",
      "adaptation_cost": "low",
      "salvage_type": "adapt_and_import",
      "adaptation_note": "Update endpoint paths for factory-v1. Keep the check logic."
    },
    {
      "file": "services/logger.js",
      "what": "Pino logger. 50 lines.",
      "why_factory_needs_it": "Structured logging. Used by everything.",
      "reuse_value": 8,
      "proof": "confirmed_live",
      "adaptation_cost": "none",
      "salvage_type": "import_as_is"
    }
  ],

  "do_not_salvage": [
    {
      "file": "scripts/governed-overnight-backlog-run.mjs",
      "why": "1779 lines. This is the autonomous runner that invents work, generates support tasks, recycles completedIds, and creates patch plans. It is the authority drift problem in code form. Do not bring it forward."
    },
    {
      "file": "services/builderos-governed-loop-executor.js",
      "why": "449 lines. The executor the runner calls. Coupled to autonomous queue decisions."
    },
    {
      "file": "All 46 AMENDMENT_*.md files as active authority",
      "why": "Reference only. They contain useful history. They are not the new constitution. Archive."
    },
    {
      "file": ".git/hooks/commit-msg and pre-commit",
      "why": "Enforce the old amendment system. Replace with simpler hooks for the factory."
    }
  ],

  "neon_database": {
    "note": "Do not create a new database. All 130+ dated migrations are already applied to the live Neon instance. The factory inherits the existing Neon DB via DATABASE_URL.",
    "live_data_today": {
      "lifeos_users": "1 user (Adam, id=1)",
      "missions": "1 mission (MISSION-0001, Approved)",
      "commitments": "8 commitments (Adam + Sherry)",
      "build_task_ledger": "active builder history"
    },
    "migration_policy": "All db/migrations/2026*.sql are applied. Archive the 14 non-2026 migrations (001_*, 20231105_*, create_*, [date]_*). Do not re-run them."
  },

  "railway": {
    "note": "Keep Railway. Keep the existing service. 107 env vars are set. Do not rebuild the deployment platform.",
    "action": "Wire the new factory repo to the same Railway service, or create a parallel service in the same Railway project. Either way, reuse the existing env vars and Neon connection."
  },

  "product_salvage_deferred": {
    "note": "LifeOS routes, feature services, HTML overlays, Lumin AI prompts — all of this is product, not factory. It belongs in PRODUCT_SALVAGE_CANDIDATES.json, written by BPB when the factory is proven and the first product mission blueprint is being written.",
    "what_exists": "60 HTML overlays, 50+ LifeOS feature services, 30+ feature route files, Lumin AI persona. All built. Most not yet wired to confirmed live routes. The factory will blueprint and verify them one by one."
  }
}

```
