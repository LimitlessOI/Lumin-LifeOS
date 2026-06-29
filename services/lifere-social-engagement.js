/**
 * SYNOPSIS: LifeRE social comment/DM engagement suggestions.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { createLifeREClientComms } from './lifere-client-comms.js';

export function createLifeRESocialEngagement({ pool = null } = {}) {
  const comms = createLifeREClientComms({ pool });

  async function suggestCommentReply({ platform, context, userId = 'adam' }) {
    const draft = `Thanks for jumping in! ${context?.slice(0, 80) || 'Great question.'} DM me if you want the full breakdown.`;
    const queued = await comms.queueDraft({
      userId,
      actionType: 'comment_reply',
      draft,
      payload: { platform, context },
    });
    return { ok: true, suggestion: draft, queue: queued, requires_approval: true };
  }

  async function suggestDmReply({ platform, context, userId = 'adam' }) {
    const draft = `Hey — saw your message. Happy to help with ${context?.slice(0, 60) || 'your question'}.`;
    const queued = await comms.queueDraft({
      userId,
      actionType: 'dm_reply',
      draft,
      payload: { platform, context },
    });
    return { ok: true, suggestion: draft, queue: queued, requires_approval: true };
  }

  return { suggestCommentReply, suggestDmReply };
}
