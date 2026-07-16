/**
 * SYNOPSIS: LifeRE receptionist bridge — inbound lead → Lead Twin + BoldTrail + inbox.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { createActionInbox } from './action-inbox.js';
import { createLifeRETwinStore } from './lifere-twin-store.js';
import { createOrUpdateContact } from '../src/integrations/boldtrail.js';

export function createLifeREReceptionistBridge({ pool = null, logger = console } = {}) {
  const twinStore = createLifeRETwinStore({ pool, logger });
  const inbox = pool ? createActionInbox({ pool, logger }) : null;

  async function inboundSummary({ callId, leadPayload = {}, userId = 'adam', tenantId = 'default' }) {
    const lead = {
      name: leadPayload.name || 'Unknown caller',
      intent: leadPayload.intent || 'buyer',
      phone: leadPayload.phone || null,
      email: leadPayload.email || null,
      source: 'receptionist_am29',
      call_id: callId,
      captured_at: new Date().toISOString(),
    };

    const leadTwin = twinStore.readTwin({ tenantId, userId, moduleKey: 'lead' })
      || { schema: 'lifere_lead_twin_v1', inbound: [] };
    leadTwin.inbound = [lead, ...(leadTwin.inbound || [])].slice(0, 50);
    await twinStore.writeTwin({
      tenantId,
      userId,
      twinKey: 'lead',
      moduleKey: 'lead',
      payload: leadTwin,
      receiptMeta: { source: 'receptionist', call_id: callId },
    });

    let inboxItem = null;
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO lifere_call_logs (tenant_id, user_id, call_id, caller_number, intent, lead_score, summary, payload)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (call_id) DO UPDATE SET summary = EXCLUDED.summary, payload = EXCLUDED.payload`,
          [
            tenantId,
            userId,
            callId || `call_${Date.now()}`,
            lead.phone,
            lead.intent,
            leadPayload.lead_score || 'warm',
            `Inbound: ${lead.name} — ${lead.intent}`,
            lead,
          ]
        );
      } catch (err) {
        logger.warn?.('[lifere-receptionist] call_logs skip:', err.message);
      }
    }
    if (inbox && leadPayload.capture_to_inbox !== false) {
      try {
        const resolvedUserId = await inbox.resolveUserId(userId);
        if (resolvedUserId) {
          inboxItem = await inbox.captureItem({
            userId: resolvedUserId,
            source: 'receptionist',
            rawText: `Inbound call ${callId}: ${lead.name} — ${lead.intent}`,
            metadata: lead,
            mode: 'conversation',
          });
        }
      } catch (err) {
        logger.warn?.('[lifere-receptionist] inbox capture skip:', err.message);
      }
    }

    let boldtrail = null;
    if (leadPayload.push_to_boldtrail !== false && (lead.phone || lead.email || lead.name)) {
      try {
        boldtrail = await createOrUpdateContact({
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: 'LifeRE-receptionist',
          note: `Inbound call ${callId || ''}: ${lead.intent} (${leadPayload.lead_score || 'warm'})`,
          tags: ['LifeRE-receptionist', lead.intent].filter(Boolean),
          meta: { call_id: callId, intent: lead.intent, via: 'lifere_receptionist_bridge' },
        });
        if (boldtrail?.ok) {
          lead.boldtrail_contact_id = boldtrail.contact_id || boldtrail.data?.id || null;
        }
      } catch (err) {
        boldtrail = { ok: false, error: err.message };
        logger.warn?.('[lifere-receptionist] BoldTrail push skip:', err.message);
      }
    }

    return {
      ok: true,
      call_id: callId,
      summary: `Inbound call qualified: ${lead.name} (${lead.intent})`,
      lead,
      lead_twin_updated: true,
      inbox_item_id: inboxItem?.id || null,
      boldtrail,
      autonomy_level: 3,
      label: boldtrail?.ok || inboxItem ? 'KNOW' : 'THINK',
    };
  }

  async function listRecentCalls({ userId = 'adam', limit = 20 } = {}) {
    if (!pool) return { ok: true, calls: [] };
    try {
      const { rows } = await pool.query(
        `SELECT call_id, caller_number, intent, lead_score, summary, created_at
         FROM lifere_call_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [userId, limit]
      );
      return { ok: true, calls: rows };
    } catch (err) {
      logger.warn?.('[lifere-receptionist] list calls skip:', err.message);
      return { ok: true, calls: [], label: 'THINK' };
    }
  }

  async function ingestVapiCallEnded({ callData, userId = 'adam', tenantId = 'default' }) {
    const transcript = callData?.transcript || callData?.analysis?.summary || '';
    const intentMatch = /buy|sell|list|invest/i.exec(transcript);
    const intent = intentMatch ? intentMatch[0].toLowerCase() : 'buyer';
    const nameMatch = /(?:this is|my name is|i'm)\s+([A-Za-z]+)/i.exec(transcript);
    return inboundSummary({
      callId: callData?.id || callData?.callId,
      userId,
      tenantId,
      leadPayload: {
        name: nameMatch?.[1] || callData?.customer?.name || 'Caller',
        phone: callData?.customer?.number || callData?.phoneNumber,
        intent,
        lead_score: callData?.status === 'completed' ? 'warm' : 'unknown',
        transcript_excerpt: transcript.slice(0, 500),
        vapi: true,
      },
    });
  }

  return { inboundSummary, listRecentCalls, ingestVapiCallEnded };
}
