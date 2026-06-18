/**
 * Action Inbox ownership regression tests.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createActionInbox } from '../services/action-inbox.js';

function createMockPool() {
  const items = new Map([
    [
      'item-1',
      {
        id: 'item-1',
        user_id: 'user-a',
        status: 'staged',
        classification: 'task',
        raw_text: 'Send the update',
      },
    ],
  ]);

  return {
    items,
    async query(sql, params = []) {
      const compactSql = String(sql).replace(/\s+/g, ' ');
      if (compactSql.includes('SELECT * FROM action_inbox_items WHERE id = $1 AND user_id = $2')) {
        const item = items.get(params[0]);
        return { rows: item && item.user_id === params[1] ? [item] : [] };
      }
      if (compactSql.includes('SELECT * FROM action_inbox_items WHERE id = $1 LIMIT 1')) {
        const item = items.get(params[0]);
        return { rows: item ? [item] : [] };
      }
      if (compactSql.includes("UPDATE action_inbox_items SET status = 'approved'")) {
        const item = items.get(params[0]);
        item.status = 'approved';
        return { rows: [item] };
      }
      throw new Error(`unexpected query: ${compactSql}`);
    },
  };
}

test('approveItem only mutates an item owned by the supplied userId', async () => {
  const pool = createMockPool();
  const inbox = createActionInbox({ pool, logger: console });

  await assert.rejects(
    () => inbox.approveItem('item-1', 'user-b'),
    (err) => err?.message === 'item_not_found' && err?.status === 404,
  );
  assert.equal(pool.items.get('item-1').status, 'staged');

  const approved = await inbox.approveItem('item-1', 'user-a');
  assert.equal(approved.status, 'approved');
});
