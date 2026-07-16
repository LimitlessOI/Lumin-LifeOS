/**
 * SYNOPSIS: LifeRE follow-up OS — BoldTrail queue + voice twin drafts + permission + approval.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { fetchBoldTrailPipeline } from './lifere-boldtrail-bridge.js';
import { createLifeREPermissionTwin } from './lifere-permission-twin.js';
import { createLifeREClientComms } from './lifere-client-comms.js';
import { createLifeRETwinStore } from './lifere-twin-store.js';

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'there';
}

function draftFromVoiceTwin({ contact, communication, personality }) {
  const first = firstName(contact.name);
  const phrases = Array.isArray(communication?.phrases) ? communication.phrases.filter(Boolean) : [];
  const warmth = Number(personality?.warmth ?? 0.5);
  const directness = Number(personality?.directness ?? 0.5);
  const opener = warmth >= 0.6
    ? `Hey ${first} — hope you're doing well.`
    : `Hi ${first},`;
  const ask = directness >= 0.6
    ? 'Quick check: still looking at homes this month, or did timing shift?'
    : 'Wanted to check in on your home search whenever you have a minute.';
  const voiceHint = phrases[0]
    ? ` ${String(phrases[0]).replace(/\s+/g, ' ').slice(0, 90)}`
    : '';
  const statusBit = contact.status_label === 'new'
    ? ' Saw you just came in — happy to help with next steps.'
    : contact.status_label === 'prospect'
      ? ' Happy to pull a few options that match what we talked about.'
      : '';
  return `${opener} ${ask}${statusBit}${voiceHint}`.replace(/\s+/g, ' ').trim();
}

export function createLifeREFollowUpOS({ pool = null } = {}) {
  const permission = createLifeREPermissionTwin({ pool });
  const comms = createLifeREClientComms({ pool });
  const twinStore = createLifeRETwinStore({ pool });

  function readVoiceTwins({ tenantId = 'default', userId }) {
    const communication = twinStore.readTwin({ tenantId, userId, twinKey: 'communication' }) || {
      phrases: [],
      tone_vector: { formal: 0.3, casual: 0.7, empathy: 0.8 },
    };
    const personality = twinStore.readTwin({ tenantId, userId, twinKey: 'personality' }) || {
      warmth: 0.5,
      directness: 0.5,
      calibration_drafts_rated: 0,
    };
    return { communication, personality };
  }

  async function prioritizeQueue({ tenantId = 'default', userId = 'adam', limit = 10 }) {
    const { communication, personality } = readVoiceTwins({ tenantId, userId });
    const pipeline = await fetchBoldTrailPipeline({ limit: 25 });
    if (pipeline.ok && pipeline.contacts?.length) {
      return pipeline.contacts.slice(0, limit).map((contact, index) => ({
        rank: index + 1,
        lead: contact.name,
        contact_id: contact.id,
        status_label: contact.status_label,
        recipient_phone: contact.phone || null,
        recipient_email: contact.email || null,
        message_draft: draftFromVoiceTwin({ contact, communication, personality }),
        voice_twin_used: true,
        calibration_drafts_rated: personality.calibration_drafts_rated || 0,
        execute_external: false,
        requires_agent_approval: true,
        source: 'boldtrail',
      }));
    }
    return [];
  }

  async function getMetrics({ tenantId = 'default', userId = 'adam' }) {
    const queue = await prioritizeQueue({ tenantId, userId, limit: 50 });
    const pipeline = await fetchBoldTrailPipeline({ limit: 50 });
    let approved_7d = 0;
    let pending = 0;
    if (pool) {
      try {
        const { rows } = await pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE status = 'approved' AND resolved_at > NOW() - INTERVAL '7 days')::int AS approved_7d,
             COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
           FROM lifere_approval_queue
           WHERE tenant_id = $1 AND user_id = $2
             AND action_type IN ('sms_lead','email_lead','sms_client','email_client')`,
          [tenantId, userId],
        );
        approved_7d = rows[0]?.approved_7d ?? 0;
        pending = rows[0]?.pending ?? 0;
      } catch {
        /* optional */
      }
    }
    const summary = pipeline.summary || {};
    return {
      ok: true,
      queue_depth: queue.length,
      pending_approvals: pending,
      follow_ups_approved_7d: approved_7d,
      follow_ups_sent_7d: approved_7d,
      boldtrail_connected: !!pipeline.connected,
      pipeline: {
        total: summary.total || 0,
        new: summary.new || 0,
        prospect: summary.prospect || 0,
        active: summary.active || 0,
      },
      speed_to_lead: { target_minutes: 15, label: pipeline.connected ? 'THINK' : 'GUESS' },
      voice_twin: {
        used_on_queue: queue.some((q) => q.voice_twin_used),
        drafts_rated: queue[0]?.calibration_drafts_rated ?? 0,
      },
      label: pipeline.connected ? 'KNOW' : 'THINK',
    };
  }

  async function draftFollowUp({ userId, contactId, message, contactMeta = {} }) {
    const tenantId = contactMeta.tenant_id || 'default';
    let draft = message;
    if (!draft) {
      const { communication, personality } = readVoiceTwins({ tenantId, userId });
      draft = draftFromVoiceTwin({
        contact: {
          name: contactMeta.recipient_name || contactMeta.lead || 'there',
          status_label: contactMeta.status_label || 'unknown',
        },
        communication,
        personality,
      });
    }
    const { level } = await permission.getAutonomyLevel({ userId, actionType: 'email_lead' });
    const channel = contactMeta.channel || (contactMeta.recipient_email ? 'email' : 'sms');
    const queued = await comms.queueDraft({
      tenantId,
      userId,
      actionType: channel === 'email' ? 'email_lead' : 'sms_lead',
      draft,
      payload: {
        contact_id: contactId,
        recipient_name: contactMeta.recipient_name || contactMeta.lead,
        recipient_phone: contactMeta.recipient_phone || contactMeta.phone,
        recipient_email: contactMeta.recipient_email || contactMeta.email,
        channel,
        source: contactMeta.source || 'follow_up_os',
      },
    });
    return { ok: true, autonomy_level: level, queue: queued, draft_text: draft, voice_twin_used: !message };
  }

  return { prioritizeQueue, draftFollowUp, getMetrics };
}
