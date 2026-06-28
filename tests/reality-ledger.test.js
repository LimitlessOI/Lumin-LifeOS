/**
 * SYNOPSIS: Reality ledger append-only store tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendRealityRecord, buildRealityRecord } from '../services/reality-ledger.js';

test('buildRealityRecord requires owner and outcomes', () => {
  const record = buildRealityRecord({
    type: 'build',
    statement: 'test build',
    owner: 'agent',
    expected_outcome: 'LIVE',
    actual_outcome: 'COMMIT_ONLY_NOT_LIVE',
    lifecycle: 'open',
  });
  assert.equal(record.owner, 'agent');
  assert.equal(record.expected_outcome, 'LIVE');
  assert.equal(record.actual_outcome, 'COMMIT_ONLY_NOT_LIVE');
});

test('appendRealityRecord writes JSONL line', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reality-ledger-'));
  const ledgerPath = path.join(tmpDir, 'records.jsonl');
  const record = appendRealityRecord({
    type: 'test',
    statement: 'append test',
    owner: 'test',
    expected_outcome: 'PASS',
    actual_outcome: 'PASS',
    lifecycle: 'closed',
  }, { ledgerPath });
  const lines = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  assert.equal(JSON.parse(lines[0]).id, record.id);
});
