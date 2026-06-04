/**
 * @ssot docs/projects/AMENDMENT_47_MISSION_RUNTIME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createCommitment } from '../services/mission-ledger.js';

const MISSION_UUID = '11111111-1111-4111-8111-111111111111';

function createFakePool() {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (String(sql).startsWith('SELECT id FROM missions')) {
        return params[0] === 'MISSION-0001' ? { rows: [{ id: MISSION_UUID }] } : { rows: [] };
      }
      if (String(sql).startsWith('SELECT id FROM lifeos_users')) {
        return String(params[0]).toLowerCase() === 'adam' ? { rows: [{ id: 42 }] } : { rows: [] };
      }
      if (String(sql).startsWith('INSERT INTO commitments')) {
        return { rows: [{ id: 99 }] };
      }
      throw new Error(`unexpected query: ${sql}`);
    },
  };
}

test('createCommitment normalizes household board payload for legacy commitments schema', async () => {
  const pool = createFakePool();

  const row = await createCommitment(pool, {
    owner: 'adam',
    text: 'Call the doctor',
    mission_id: 'MISSION-0001',
    due_date: '2026-06-05',
  });

  assert.deepEqual(row, { id: 99 });
  const insert = pool.calls.find((call) => String(call.sql).startsWith('INSERT INTO commitments'));
  assert.ok(insert, 'expected INSERT INTO commitments query');
  assert.match(insert.sql, /user_id/);
  assert.match(insert.sql, /title/);
  assert.match(insert.sql, /mission_id/);
  assert.match(insert.sql, /status/);
  assert.deepEqual(insert.params, [
    42,
    'Call the doctor',
    MISSION_UUID,
    'adam',
    'Call the doctor',
    '2026-06-05',
    'open',
  ]);
});

test('createCommitment fails clearly for unknown mission slug', async () => {
  const pool = createFakePool();

  await assert.rejects(
    () => createCommitment(pool, {
      owner: 'adam',
      text: 'Call the doctor',
      mission_id: 'MISSING-MISSION',
    }),
    { code: 'MISSION_NOT_FOUND' },
  );
});

test('createCommitment fails clearly for unknown owner handle', async () => {
  const pool = createFakePool();

  await assert.rejects(
    () => createCommitment(pool, {
      owner: 'unknown',
      text: 'Call the doctor',
      mission_id: 'MISSION-0001',
    }),
    { code: 'USER_NOT_FOUND' },
  );
});
