/**
 * LifeOS Commitment Route v2.1 — approved inbox commitment → commitment tracker.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { createActionInbox } from './action-inbox.js';
import { createCommitmentTrackerService } from './lifeos-commitment-tracker.js';

export function createLifeOSCommitmentRoute({ pool, logger }) {
  const inbox = createActionInbox({ pool, logger });
  const commitments = createCommitmentTrackerService(pool);

  async function routeFromInbox(itemId, userId) {
    const item = await inbox.getItem(itemId, userId);
    if (item.classification !== 'commitment') {
      const err = new Error('not_a_commitment');
      err.status = 400;
      err.detail = { classification: item.classification };
      throw err;
    }
    if (item.status !== 'approved' && item.status !== 'staged') {
      const err = new Error('invalid_status_for_route');
      err.status = 400;
      err.detail = { status: item.status, required: 'approved or staged' };
      throw err;
    }

    let approved = item;
    if (item.status === 'staged') {
      approved = await inbox.approveItem(itemId);
    }

    const commitment = await commitments.addCommitment(userId, {
      text: approved.raw_text,
      source: 'action_inbox',
    });

    const routed = await inbox.routeItem(itemId, { department: 'commitments' });
    await inbox.markDone(itemId);

    return {
      inbox_item_id: itemId,
      commitment_id: commitment.id,
      commitment,
      route: routed,
    };
  }

  return { routeFromInbox, inbox, commitments };
}
