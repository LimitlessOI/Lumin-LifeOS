/**
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLifeOSCommitmentRoute } from '../services/lifeos-commitment-route.js';

function makePool({ failOnReceipt = false } = {}) {
  const state = {
    item: {
      id: 'inbox-1',
      user_id: 'user-1',
      classification: 'commitment',
      status: 'staged',
      raw_text: 'I will call the client today',
      receipt_id: null,
      routed_to: null,
    },
    commitments: [],
    receipts: [],
  };

  return {
    state,
    connectCalls: 0,
    connect() {
      this.connectCalls++;
      let tx = null;
      const client = {
        released: false,
        async query(sql, params = []) {
          const s = String(sql);
          if (s === 'BEGIN') {
            tx = JSON.parse(JSON.stringify(state));
            return { rows: [] };
          }
          if (s === 'COMMIT') {
            Object.assign(state, tx);
            tx = null;
            return { rows: [] };
          }
          if (s === 'ROLLBACK') {
            tx = null;
            return { rows: [] };
          }
          const target = tx || state;
          if (s.includes('FROM action_inbox_items') && s.includes('FOR UPDATE')) {
            return target.item.id === params[0] && target.item.user_id === params[1]
              ? { rows: [target.item] }
              : { rows: [] };
          }
          if (s.includes("SET status = 'approved'")) {
            target.item = { ...target.item, status: 'approved' };
            return { rows: [target.item] };
          }
          if (s.includes('INSERT INTO lifeos_commitments')) {
            const row = {
              id: `commitment-${target.commitments.length + 1}`,
              user_id: params[0],
              text: params[1],
              source: 'action_inbox',
              status: 'active',
            };
            target.commitments.push(row);
            return { rows: [row] };
          }
          if (s.includes('INSERT INTO action_inbox_receipts')) {
            if (failOnReceipt) throw new Error('receipt_write_failed');
            const row = {
              id: `receipt-${target.receipts.length + 1}`,
              inbox_item_id: params[0],
              outcome: 'done',
              detail: JSON.parse(params[1]),
            };
            target.receipts.push(row);
            return { rows: [row] };
          }
          if (s.includes("SET status = 'done'")) {
            target.item = {
              ...target.item,
              status: 'done',
              routed_to: 'commitments',
              receipt_id: params[1],
            };
            return { rows: [target.item] };
          }
          return { rows: [] };
        },
        release() {
          this.released = true;
        },
      };
      return client;
    },
  };
}

test('commitment route rolls back inserted commitment when inbox receipt write fails', async () => {
  const pool = makePool({ failOnReceipt: true });
  const service = createLifeOSCommitmentRoute({ pool, logger: null });

  await assert.rejects(
    () => service.routeFromInbox('inbox-1', 'user-1'),
    /receipt_write_failed/,
  );

  assert.equal(pool.state.commitments.length, 0);
  assert.equal(pool.state.receipts.length, 0);
  assert.equal(pool.state.item.status, 'staged');
});

test('commitment route commits item, receipt, and commitment together', async () => {
  const pool = makePool();
  const service = createLifeOSCommitmentRoute({ pool, logger: null });

  const result = await service.routeFromInbox('inbox-1', 'user-1');

  assert.equal(result.commitment_id, 'commitment-1');
  assert.equal(pool.state.commitments.length, 1);
  assert.equal(pool.state.receipts.length, 1);
  assert.equal(pool.state.item.status, 'done');
  assert.equal(pool.state.item.routed_to, 'commitments');
  assert.equal(pool.state.receipts[0].detail.commitment_id, 'commitment-1');
});
