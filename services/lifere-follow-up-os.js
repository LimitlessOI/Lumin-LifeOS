/**
 * SYNOPSIS: LifeRE follow-up OS — BoldTrail queue + permission + approval.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { fetchBoldTrailPipeline } from './lifere-boldtrail-bridge.js';
import { createLifeREPermissionTwin } from './lifere-permission-twin.js';
import { createLifeREClientComms } from './lifere-client-comms.js';

export function createLifeREFollowUpOS({ pool = null } = {}) {
  const permission = createLifeREPermissionTwin({ pool });
  const comms = createLifeREClientComms({ pool });

  async function prioritizeQueue({ userId = 'adam', limit = 10 }) {
    const pipeline = await fetchBoldTrailPipeline({ limit: 25 });
    if (pipeline.ok && pipeline.contacts?.length) {
      return pipeline.contacts.slice(0, limit).map((contact, index) => ({
        rank: index + 1,
        lead: contact.name,
        contact_id: contact.id,
        status_label: contact.status_label,
        message_draft: `Hey ${(contact.name || '').split(' ')[0] || 'there'}, wanted to follow up on your home search.`,
        execute_external: false,
        requires_agent_approval: true,
        source: 'boldtrail',
      }));
    }
    return [];
  }

  async function draftFollowUp({ userId, contactId, message }) {
    const { level } = await permission.getAutonomyLevel({ userId, actionType: 'email_lead' });
    const queued = await comms.queueDraft({
      userId,
      actionType: 'email_lead',
      draft: message,
      payload: { contact_id: contactId },
    });
    return { ok: true, autonomy_level: level, queue: queued };
  }

  return { prioritizeQueue, draftFollowUp };
}
