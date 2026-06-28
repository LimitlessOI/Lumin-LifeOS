/**
 * SYNOPSIS: js — tests/builderos-command-control-service.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapDbRowToFounderBuildJob } from '../services/builderos-command-control-service.js';

test('founder build job does not become completed from committed row alone', () => {
  const row = {
    id: 'job-1',
    instruction: 'fix something',
    status: 'committed',
    blocker: 'COMMIT_NO_SHA',
    metadata_json: { kind: 'founder_interface_build' },
    result_json: {
      founder_result: {
        pass_fail: 'FAIL',
        first_blocker: 'COMMIT_NO_SHA',
      },
    },
  };
  const mapped = mapDbRowToFounderBuildJob(row);
  assert.equal(mapped.status, 'failed');
  assert.equal(mapped.result.pass_fail, 'FAIL');
  assert.equal(mapped.result.persistence_status, 'committed');
});

test('founder build job stays waiting_for_proof when pass is only commit-level', () => {
  const row = {
    id: 'job-2',
    instruction: 'fix something else',
    status: 'committed',
    blocker: null,
    metadata_json: { kind: 'founder_interface_build' },
    result_json: {
      founder_result: {
        pass_fail: 'PASS',
        committed: true,
        transport_status: 'COMMIT_ONLY_NOT_LIVE',
      },
    },
  };
  const mapped = mapDbRowToFounderBuildJob(row);
  assert.equal(mapped.status, 'waiting_for_proof');
  assert.equal(mapped.result.pass_fail, 'PASS');
  assert.equal(mapped.result.transport_status, 'COMMIT_ONLY_NOT_LIVE');
  assert.equal(mapped.result.persistence_status, 'committed');
});
