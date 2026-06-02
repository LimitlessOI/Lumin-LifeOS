/**
 * Mission Runtime transition regression tests.
 *
 * @ssot docs/projects/AMENDMENT_47_MISSION_RUNTIME.md
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transitionMissionState } from '../services/mission-ledger.js';

function createTransitionPoolFixture() {
  let state = 'Approved';
  let locked = false;
  const waiters = [];
  const transitions = [];
  let resolveFirstRead;
  const firstRead = new Promise((resolve) => {
    resolveFirstRead = resolve;
  });

  async function acquireLock() {
    if (!locked) {
      locked = true;
      return;
    }
    await new Promise((resolve) => waiters.push(resolve));
    locked = true;
  }

  function releaseLock() {
    const next = waiters.shift();
    if (next) {
      next();
      return;
    }
    locked = false;
  }

  function missionRows(id) {
    resolveFirstRead();
    return { rows: [{ id, state }] };
  }

  return {
    firstRead,
    transitions,
    getState: () => state,
    pool: {
      async query(sql, params) {
        if (sql.includes('SELECT * FROM missions')) {
          return missionRows(params[0]);
        }
        throw new Error(`unexpected pool.query: ${sql}`);
      },
      async connect() {
        let hasLock = false;
        return {
          async query(sql, params) {
            if (sql === 'BEGIN') return { rows: [] };
            if (sql.includes('SELECT * FROM missions') && sql.includes('FOR UPDATE')) {
              await acquireLock();
              hasLock = true;
              return missionRows(params[0]);
            }
            if (sql.includes('UPDATE missions SET state')) {
              if (params[0] === 'Building') {
                await new Promise((resolve) => setTimeout(resolve, 25));
              }
              state = params[0];
              return { rows: [{ id: params[1], state }] };
            }
            if (sql.includes('INSERT INTO mission_state_transitions')) {
              const row = {
                mission_id: params[0],
                from_state: params[1],
                to_state: params[2],
                transitioned_by: params[3],
                note: params[4],
              };
              transitions.push(row);
              return { rows: [row] };
            }
            if (sql === 'COMMIT' || sql === 'ROLLBACK') {
              if (hasLock) {
                releaseLock();
                hasLock = false;
              }
              return { rows: [] };
            }
            throw new Error(`unexpected client.query: ${sql}`);
          },
          release() {},
        };
      },
    },
  };
}

test('transitionMissionState serializes concurrent transitions on the mission row', async () => {
  const fixture = createTransitionPoolFixture();
  const first = transitionMissionState(fixture.pool, 'mission-1', {
    to_state: 'Building',
    transitioned_by: 'agent',
    note: 'start build',
  });

  await fixture.firstRead;
  const second = transitionMissionState(fixture.pool, 'mission-1', {
    to_state: 'BPB Blueprinting',
    transitioned_by: 'agent',
    note: 'return to blueprint',
  });

  const [firstResult, secondResult] = await Promise.allSettled([first, second]);

  assert.equal(firstResult.status, 'fulfilled');
  assert.equal(secondResult.status, 'rejected');
  assert.equal(secondResult.reason.code, 'INVALID_TRANSITION');
  assert.equal(secondResult.reason.from, 'Building');
  assert.deepEqual(secondResult.reason.valid_next, ['Verification', 'Approved']);
  assert.equal(fixture.getState(), 'Building');
  assert.deepEqual(
    fixture.transitions.map((row) => `${row.from_state}->${row.to_state}`),
    ['Approved->Building'],
  );
});
