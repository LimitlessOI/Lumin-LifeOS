/**
 * SYNOPSIS: Tests for decision-record verifier and Collaboration Spine assembler.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { verifyDecisionRecord } from '../scripts/verify-decision-record.mjs';
import { assembleCollaborationSpine } from '../scripts/collaboration-spine-assemble.mjs';

const validDecision = `<!-- SYNOPSIS: DECISION-0003 test -->

# DECISION-0003 — Test Decision

**Decision ID:** DECISION-0003

## Decision

Do the thing.

## Founder intent

Test.

## Problem being solved

Missing tests.

## Alternatives considered

| Alternative | Pros | Cons | Why |
|---|---|---|---|
| A | fast | risky | chosen |

## Per-role reasoning

- Chair: keep it simple.

## Assumptions

1. Markdown works.

## Predictions

1. It will pass.

## Success criteria

- [ ] test passes.

## Failure criteria

- If it fails, revisit.

## Consensus

All agree.

## Why this decision

Smallest test.

## Implementation trace

- file.md

## Sentry verification

- test passes.

## Actual real-world outcome

Pending.

## Prediction-versus-reality comparison

Pending.

## Resulting lessons / wisdom update

Pending.

## Reality judgment

- **Status:** PENDING
- **Evidence:** none
- **Next action:** run tests
`;

test('verifyDecisionRecord passes a valid decision record', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'decision-'));
  const file = path.join(tmpDir, 'DECISION-0003.md');
  fs.writeFileSync(file, validDecision);
  const result = verifyDecisionRecord(file);
  assert.equal(result.ok, true);
  assert.equal(result.decision_id, 'DECISION-0003');
  assert.equal(result.errors.length, 0);
});

test('verifyDecisionRecord fails missing headings', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'decision-'));
  const file = path.join(tmpDir, 'DECISION-0003.md');
  fs.writeFileSync(file, '# DECISION-0003\n\n## Decision\n\nOnly one heading.\n');
  const result = verifyDecisionRecord(file);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('Missing required heading')));
});

test('assembleCollaborationSpine produces COLLABORATION_SPINE.md and json', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spine-'));
  const outMd = path.join(tmpDir, 'COLLABORATION_SPINE.md');
  const outJson = path.join(tmpDir, 'COLLABORATION_SPINE.json');
  const decisionFile = path.join(tmpDir, 'DECISION-0003.md');
  fs.writeFileSync(decisionFile, validDecision);

  const result = await assembleCollaborationSpine({ decisionsDir: tmpDir, outMd, outJson });
  assert.equal(result.ok, true);
  assert.equal(result.count, 1);
  assert.ok(fs.existsSync(outMd));
  assert.ok(fs.existsSync(outJson));

  const json = JSON.parse(fs.readFileSync(outJson, 'utf8'));
  assert.equal(json.decisions[0].decision_id, 'DECISION-0003');
  const md = fs.readFileSync(outMd, 'utf8');
  assert.ok(md.includes('DECISION-0003'));
});

test('assembleCollaborationSpine reports invalid records', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spine-'));
  const outMd = path.join(tmpDir, 'COLLABORATION_SPINE.md');
  const outJson = path.join(tmpDir, 'COLLABORATION_SPINE.json');
  const decisionFile = path.join(tmpDir, 'DECISION-0003.md');
  fs.writeFileSync(decisionFile, '# DECISION-0003\n\n## Decision\n\nOnly one heading.\n');

  const result = await assembleCollaborationSpine({ decisionsDir: tmpDir, outMd, outJson });
  assert.equal(result.ok, false);
  assert.equal(result.count, 0);
  assert.equal(result.errors, 1);
});
