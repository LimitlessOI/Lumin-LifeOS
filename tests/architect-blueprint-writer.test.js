/**
 * SYNOPSIS: js — tests/architect-blueprint-writer.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  extractWorkflowPathFromFinding,
  buildQueueStepFromFinding,
  writeApprovedFindingToBlueprint,
  runArchitectPass,
} from '../services/architect-blueprint-writer.js';

function makeFixtureRoot(initialSteps = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'architect-fixture-'));
  const productDir = path.join(root, 'docs/products/builderos');
  fs.mkdirSync(productDir, { recursive: true });
  fs.writeFileSync(
    path.join(productDir, 'BUILD_QUEUE.json'),
    JSON.stringify({ schema: 'product_build_queue_v1', product_id: 'builderos', steps: initialSteps }, null, 2),
  );
  return root;
}

test('extractWorkflowPathFromFinding: parses the workflow path out of a broken_workflow finding id', () => {
  const path_ = extractWorkflowPathFromFinding({ check: 'workflow_health', id: 'broken_workflow:.github/workflows/migrate.yml' });
  assert.equal(path_, '.github/workflows/migrate.yml');
});

test('extractWorkflowPathFromFinding: returns null for a non-workflow_health finding rather than guessing', () => {
  assert.equal(extractWorkflowPathFromFinding({ check: 'ci_health', id: 'ci_health:x:abc' }), null);
  assert.equal(extractWorkflowPathFromFinding(null), null);
});

test('buildQueueStepFromFinding: builds a real, schema-valid step for an approved workflow_health finding', () => {
  const finding = {
    id: 'broken_workflow:.github/workflows/migrate.yml',
    check: 'workflow_health',
    chair_status: 'approved',
    summary: 'migrate.yml fails instantly on every run',
    proposed_solution: 'remove the stray markdown fences from the yaml',
  };
  const step = buildQueueStepFromFinding(finding);
  assert.equal(step.target_file, '.github/workflows/migrate.yml');
  assert.equal(step.status, 'pending');
  assert.equal(step.task, finding.summary);
  assert.equal(step.spec, finding.proposed_solution);
  assert.equal(step.founder_gated, false);
  assert.equal(step.finding_id, finding.id);
});

test('buildQueueStepFromFinding: returns null for ci_health (no safe target_file) — never guesses', () => {
  const finding = {
    id: 'ci_health:smoke-test.yml:deadbeef',
    check: 'ci_health',
    chair_status: 'approved',
    summary: 'main is red',
    proposed_solution: 'read the log and fix it',
  };
  assert.equal(buildQueueStepFromFinding(finding), null);
});

test('buildQueueStepFromFinding: returns null for a finding Chair did not approve, even if it has a workflow_health shape', () => {
  const finding = {
    id: 'broken_workflow:.github/workflows/x.yml',
    check: 'workflow_health',
    chair_status: 'escalate_to_founder', // hypothetically not approved
    summary: 's',
    proposed_solution: 'a fix',
  };
  assert.equal(buildQueueStepFromFinding(finding), null);
});

test('writeApprovedFindingToBlueprint: writes a real step into an isolated fixture queue, prepended so it ships next', () => {
  const root = makeFixtureRoot([{ id: 'existing-step', status: 'pending', target_file: 'x.js', task: 'old work', spec: 's', depends_on: [], founder_gated: false }]);
  try {
    const finding = {
      id: 'broken_workflow:.github/workflows/migrate.yml',
      check: 'workflow_health',
      chair_status: 'approved',
      summary: 'migrate.yml fails instantly',
      proposed_solution: 'remove stray markdown fences',
    };
    const result = writeApprovedFindingToBlueprint(finding, { root });
    assert.equal(result.written, true);
    assert.equal(result.product_id, 'builderos');

    const onDisk = JSON.parse(fs.readFileSync(path.join(root, 'docs/products/builderos/BUILD_QUEUE.json'), 'utf8'));
    assert.equal(onDisk.steps.length, 2);
    assert.equal(onDisk.steps[0].finding_id, finding.id, 'new urgent step must be prepended, not appended behind older work');
    assert.equal(onDisk.steps[1].id, 'existing-step');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('writeApprovedFindingToBlueprint: does not duplicate a step for a finding already queued', () => {
  const root = makeFixtureRoot();
  try {
    const finding = {
      id: 'broken_workflow:.github/workflows/migrate.yml',
      check: 'workflow_health',
      chair_status: 'approved',
      summary: 's',
      proposed_solution: 'a real fix',
    };
    const first = writeApprovedFindingToBlueprint(finding, { root });
    assert.equal(first.written, true);
    const second = writeApprovedFindingToBlueprint(finding, { root });
    assert.equal(second.written, false);
    assert.equal(second.reason, 'already_queued');

    const onDisk = JSON.parse(fs.readFileSync(path.join(root, 'docs/products/builderos/BUILD_QUEUE.json'), 'utf8'));
    assert.equal(onDisk.steps.length, 1, 'must not duplicate');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('writeApprovedFindingToBlueprint: an unwritable finding type is reported honestly, not silently dropped', () => {
  const root = makeFixtureRoot();
  try {
    const finding = { id: 'ci_health:x:abc', check: 'ci_health', chair_status: 'approved', summary: 's', proposed_solution: 'a fix' };
    const result = writeApprovedFindingToBlueprint(finding, { root });
    assert.equal(result.written, false);
    assert.equal(result.reason, 'no_safe_target_file');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('runArchitectPass: processes a mixed list, only touching approved findings, labeling each honestly', () => {
  const root = makeFixtureRoot();
  try {
    const findings = [
      { id: 'broken_workflow:.github/workflows/migrate.yml', check: 'workflow_health', chair_status: 'approved', summary: 's', proposed_solution: 'a real fix' },
      { id: 'ci_health:x:abc', check: 'ci_health', chair_status: 'approved', summary: 's', proposed_solution: 'a real fix' },
      { id: 'empty_backlog:lifeos', check: 'product_backlog', chair_status: 'escalate_to_founder', summary: 's', proposed_solution: 'a real fix' },
    ];
    const result = runArchitectPass(findings, { root });

    assert.equal(result[0].architect_status, 'queued_to_blueprint');
    assert.equal(result[1].architect_status, 'needs_manual_targeting');
    assert.equal(result[2].architect_status, undefined, 'Architect must not touch a finding Chair did not approve');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
