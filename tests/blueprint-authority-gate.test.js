/**
 * SYNOPSIS: Tests for scripts/lib/blueprint-authority-gate.mjs
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadBlueprint,
  evaluateBlueprintAuthority,
  formatBlueprintFindings,
} from '../scripts/lib/blueprint-authority-gate.mjs';

function makeBlueprint(steps) {
  return {
    schema: 'blueprint_v1',
    mission_id: 'TEST',
    steps,
  };
}

function withTempBlueprint(json, callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-gate-'));
  const file = path.join(dir, 'BLUEPRINT.json');
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
  try {
    return callback(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('loadBlueprint returns error for missing file', () => {
  const result = loadBlueprint('/nonexistent/BLUEPRINT.json');
  assert.equal(result.ok, false);
  assert.ok(result.error.includes('not found'));
});

test('evaluateBlueprintAuthority passes a covered in-progress file', () => {
  const bp = makeBlueprint([
    {
      step_id: 'M2C-010',
      phase_id: 'P3',
      status: 'IN_PROGRESS',
      target_files: ['scripts/lib/blueprint-authority-gate.mjs'],
      allowed_context_files: [],
    },
  ]);
  withTempBlueprint(bp, (file) => {
    const result = evaluateBlueprintAuthority(
      [{ path: 'scripts/lib/blueprint-authority-gate.mjs' }],
      { blueprintPath: file },
    );
    assert.equal(result.ok, true);
    assert.equal(result.warnings.length, 0);
    assert.equal(result.errors.length, 0);
    assert.ok(result.findings.some((f) => f.type === 'file_in_progress'));
  });
});

test('evaluateBlueprintAuthority warns on uncovered file', () => {
  const bp = makeBlueprint([
    {
      step_id: 'M2C-010',
      phase_id: 'P3',
      status: 'IN_PROGRESS',
      target_files: ['scripts/lib/blueprint-authority-gate.mjs'],
    },
  ]);
  withTempBlueprint(bp, (file) => {
    const result = evaluateBlueprintAuthority(
      [{ path: 'scripts/lib/surprise.mjs' }],
      { blueprintPath: file },
    );
    assert.equal(result.ok, true);
    assert.ok(result.warnings.length > 0);
    assert.ok(result.findings.some((f) => f.type === 'uncovered_file'));
  });
});

test('evaluateBlueprintAuthority flags protected uncovered file as error finding', () => {
  const bp = makeBlueprint([
    {
      step_id: 'M2C-010',
      phase_id: 'P3',
      status: 'IN_PROGRESS',
      target_files: ['scripts/lib/blueprint-authority-gate.mjs'],
    },
  ]);
  withTempBlueprint(bp, (file) => {
    const result = evaluateBlueprintAuthority(
      [{ path: 'services/surprise-service.js' }],
      { blueprintPath: file },
    );
    assert.equal(result.ok, true);
    assert.ok(result.errors.length > 0);
    assert.ok(result.findings.some((f) => f.type === 'protected_uncovered_file' && f.severity === 'error'));
  });
});

test('evaluateBlueprintAuthority flags DONE step without git_sha as false_done_unsealed', () => {
  const bp = makeBlueprint([
    {
      step_id: 'M2C-008',
      phase_id: 'P2',
      status: 'DONE',
      target_files: ['docs/constitution/AMENDMENT_BUILDEROS_CONVERGENCE.md'],
      git_sha: '',
      completed_at: '2026-07-31T05:55:00Z',
      evidence: 'some evidence',
    },
  ]);
  withTempBlueprint(bp, (file) => {
    const result = evaluateBlueprintAuthority([], { blueprintPath: file });
    assert.equal(result.ok, true);
    assert.ok(result.findings.some((f) => f.type === 'false_done_unsealed'));
  });
});

test('formatBlueprintFindings renders readable list', () => {
  const findings = [{ type: 'uncovered_file', message: 'File x.js not covered' }];
  const text = formatBlueprintFindings(findings);
  assert.ok(text.includes('[uncovered_file]'));
  assert.ok(text.includes('x.js'));
});
