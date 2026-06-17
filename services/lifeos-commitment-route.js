/**
 * LifeOS Commitment Route v2.1 — approved inbox commitment → commitment tracker.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { createActionInbox } from './action-inbox.js';
import { createCommitmentTrackerService } from './lifeos-commitment-tracker.js';

export function createLifeOSCommitmentRoute({ pool, logger }) {
  const inbox = createActionInbox({ pool, logger });
  const commitments = createCommitmentTrackerService(pool);

  function routeError(message, status, detail = undefined) {
    const err = new Error(message);
    err.status = status;
    if (detail !== undefined) err.detail = detail;
    return err;
  }

  async function routeFromInbox(itemId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT * FROM action_inbox_items WHERE id = $1 AND user_id = $2 LIMIT 1 FOR UPDATE`,
        [itemId, userId],
      );
      const item = rows[0];
      if (!item) throw routeError('item_not_found', 404);
      if (item.classification !== 'commitment') {
        throw routeError('not_a_commitment', 400, { classification: item.classification });
      }
      if (item.status !== 'approved' && item.status !== 'staged') {
        throw routeError('invalid_status_for_route', 400, { status: item.status, required: 'approved or staged' });
      }

      const approved = item.status === 'staged'
        ? (await client.query(
          `UPDATE action_inbox_items SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *`,
          [itemId],
        )).rows[0]
        : item;

      const { rows: commitmentRows } = await client.query(
        `INSERT INTO lifeos_commitments (user_id, text, due_date, source, status, created_at)
         VALUES ($1, $2, NULL, 'action_inbox', 'active', NOW()) RETURNING *`,
        [userId, approved.raw_text],
      );
      const commitment = commitmentRows[0];

      const { rows: receiptRows } = await client.query(
        `INSERT INTO action_inbox_receipts (inbox_item_id, outcome, detail)
         VALUES ($1, 'done', $2::jsonb)
         RETURNING *`,
        [itemId, JSON.stringify({
          department: 'commitments',
          routed_at: new Date().toISOString(),
          commitment_id: commitment.id,
        })],
      );
      const receipt = receiptRows[0];

      const { rows: updatedRows } = await client.query(
        `UPDATE action_inbox_items
           SET status = 'done', routed_to = 'commitments', receipt_id = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [itemId, receipt.id],
      );
      const routed = { item: updatedRows[0], receipt };

      await client.query('COMMIT');
      return {
        inbox_item_id: itemId,
        commitment_id: commitment.id,
        commitment,
        route: routed,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  return { routeFromInbox, inbox, commitments };
}
