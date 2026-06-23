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
        recipient_phone: contact.phone || null,
        recipient_email: contact.email || null,
        message_draft: `Hey ${(contact.name || '').split(' ')[0] || 'there'}, wanted to follow up on your home search.`,
        execute_external: false,
        requires_agent_approval: true,
        source: 'boldtrail',
      }));
    }
    return [];
  }

  async function draftFollowUp({ userId, contactId, message, contactMeta = {} }) {
    const { level } = await permission.getAutonomyLevel({ userId, actionType: 'email_lead' });
    const channel = contactMeta.channel || (contactMeta.recipient_email ? 'email' : 'sms');
    const queued = await comms.queueDraft({
      tenantId: contactMeta.tenant_id || 'default',
      userId,
      actionType: channel === 'email' ? 'email_lead' : 'sms_lead',
      draft: message,
      payload: {
        contact_id: contactId,
        recipient_name: contactMeta.recipient_name || contactMeta.lead,
        recipient_phone: contactMeta.recipient_phone || contactMeta.phone,
        recipient_email: contactMeta.recipient_email || contactMeta.email,
        channel,
        source: contactMeta.source || 'follow_up_os',
      },
    });
    return { ok: true, autonomy_level: level, queue: queued };
  }

  return { prioritizeQueue, draftFollowUp };
}
