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

  /**
   * Unified phone + text inbox for LifeRE Ops.
   * Merges lifere_call_logs (Vapi/receptionist) with lifeos_communication_log (Twilio gateway).
   */
  async function listPhoneTextInbox({ userId = 'adam', limit = 40 } = {}) {
    const items = [];
    const calls = await listRecentCalls({ userId, limit: Math.min(limit, 25) });
    for (const call of calls.calls || []) {
      items.push({
        id: `call_${call.call_id}`,
        channel: 'call',
        direction: 'inbound',
        from: call.caller_number || null,
        body: call.summary || null,
        summary: call.summary || null,
        intent: call.intent || null,
        lead_score: call.lead_score || null,
        call_id: call.call_id,
        created_at: call.created_at,
        source: 'lifere_call_logs',
      });
    }

    if (pool) {
      try {
        const { rows: uuidRows } = await pool.query(
          `SELECT id::text AS id FROM lifeos_users
           WHERE lower(email) LIKE '%adam%' OR lower(handle) = $1 OR id::text = $1
           ORDER BY id ASC LIMIT 3`,
          [String(userId)],
        ).catch(() => ({ rows: [] }));
        const { rows: textIdRows } = await pool.query(
          `SELECT id::text AS id FROM users
           WHERE lower(coalesce(email,'')) LIKE '%adam%' OR lower(coalesce(username,'')) = $1
           ORDER BY id ASC LIMIT 3`,
          [String(userId)],
        ).catch(() => ({ rows: [] }));

        const ownerIds = [...new Set([
          ...uuidRows.map((r) => r.id),
          ...textIdRows.map((r) => r.id),
        ].filter(Boolean))];

        let commRows = [];
        if (ownerIds.length) {
          const { rows } = await pool.query(
            `SELECT id, direction, channel, from_party, to_party, body, ai_summary,
                    screen_decision, duration_s, created_at
             FROM lifeos_communication_log
             WHERE user_id::text = ANY($1::text[])
             ORDER BY created_at DESC
             LIMIT $2`,
            [ownerIds, limit],
          );
          commRows = rows;
        } else {
          const { rows } = await pool.query(
            `SELECT id, direction, channel, from_party, to_party, body, ai_summary,
                    screen_decision, duration_s, created_at
             FROM lifeos_communication_log
             ORDER BY created_at DESC
             LIMIT $1`,
            [Math.min(limit, 20)],
          );
          commRows = rows;
        }

        for (const row of commRows) {
          items.push({
            id: `gw_${row.id}`,
            channel: row.channel || 'sms',
            direction: row.direction || 'inbound',
            from: row.from_party || null,
            to: row.to_party || null,
            body: row.body || null,
            summary: row.ai_summary || null,
            screen_decision: row.screen_decision || null,
            duration_s: row.duration_s || null,
            created_at: row.created_at,
            source: 'lifeos_gateway',
          });
        }
      } catch (err) {
        logger.warn?.('[lifere-receptionist] gateway inbox skip:', err.message);
      }
    }

    items.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    const smsCount = items.filter((i) => i.channel === 'sms').length;
    const callCount = items.filter((i) => i.channel === 'call').length;
    return {
      ok: true,
      items: items.slice(0, limit),
      counts: { total: Math.min(items.length, limit), sms: smsCount, calls: callCount },
      phone_setup: {
        vapi_configured: !!(process.env.VAPI_API_KEY && process.env.VAPI_ASSISTANT_ID),
        twilio_gateway: '/api/v1/lifeos/gateway/inbound/sms|call',
        note: 'Point Twilio webhooks at LifeOS gateway; Vapi call-ended fans into LifeRE receptionist.',
      },
      label: items.length ? 'KNOW' : 'THINK',
    };
  }

  function maskPhone(n) {
    const s = String(n || '');
    if (s.length < 4) return s ? '***' : null;
    return `***${s.slice(-4)}`;
  }

  function publicBaseUrl() {
    const raw = process.env.PUBLIC_BASE_URL
      || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
      || 'https://lumin-web-production-e3a9.up.railway.app';
    return String(raw).replace(/\/$/, '');
  }

  function lifeReVapiWebhookUrl() {
    return `${publicBaseUrl()}/api/v1/lifere/receptionist/vapi-end`;
  }

  function normalizeVapiWebhookBody(body = {}) {
    const msg = body?.message && typeof body.message === 'object' ? body.message : null;
    const type = msg?.type || body?.type || body?.event || null;
    const call = msg?.call || body?.call || (body?.id && body?.customer ? body : null) || {};
    const transcript = msg?.transcript
      || msg?.artifact?.transcript
      || call?.transcript
      || body?.transcript
      || msg?.analysis?.summary
      || call?.analysis?.summary
      || '';
    const summary = msg?.summary || msg?.analysis?.summary || call?.analysis?.summary || body?.summary || '';
    const ended = !type
      || /end-of-call|call-ended|hang/i.test(String(type))
      || String(call?.status || body?.status || '').toLowerCase() === 'ended'
      || String(call?.status || body?.status || '').toLowerCase() === 'completed';
    return {
      type,
      should_ingest: ended,
      callData: {
        ...call,
        id: call?.id || call?.callId || body?.call_id || body?.id,
        transcript: transcript || call?.transcript,
        analysis: { ...(call?.analysis || {}), summary: summary || call?.analysis?.summary },
        status: call?.status || body?.status || (ended ? 'completed' : call?.status),
        customer: call?.customer || body?.customer,
        phoneNumber: call?.phoneNumber || call?.customer?.number || body?.phoneNumber,
      },
    };
  }

  async function vapiFetch(path, { method = 'GET', body = null } = {}) {
    const apiKey = process.env.VAPI_API_KEY;
    if (!apiKey) throw new Error('VAPI_API_KEY not set on tip');
    const res = await fetch(`https://api.vapi.ai${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 300) }; }
    if (!res.ok) {
      const err = new Error(`Vapi ${method} ${path} → ${res.status}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  }

  async function inspectVapiPhoneSystem() {
    const webhookUrl = lifeReVapiWebhookUrl();
    const assistantId = process.env.VAPI_ASSISTANT_ID || null;
    const preferredPhoneId = process.env.VAPI_PHONE_NUMBER_ID || null;
    const env = {
      VAPI_API_KEY: Boolean(process.env.VAPI_API_KEY),
      VAPI_ASSISTANT_ID: Boolean(assistantId),
      VAPI_PHONE_NUMBER_ID: Boolean(preferredPhoneId),
      VAPI_WEBHOOK_SECRET: Boolean(process.env.VAPI_WEBHOOK_SECRET || process.env.VAPI_SECRET),
      TWILIO_ACCOUNT_SID: Boolean(process.env.TWILIO_ACCOUNT_SID),
      TWILIO_AUTH_TOKEN: Boolean(process.env.TWILIO_AUTH_TOKEN),
      TWILIO_PHONE_NUMBER: Boolean(process.env.TWILIO_PHONE_NUMBER),
      ADAM_SMS_NUMBER: Boolean(process.env.ADAM_SMS_NUMBER),
      ALERT_PHONE_NUMBER: Boolean(process.env.ALERT_PHONE_NUMBER),
    };

    if (!env.VAPI_API_KEY) {
      return {
        ok: false,
        error: 'VAPI_API_KEY missing on tip',
        env,
        webhook_url: webhookUrl,
        label: 'KNOW',
      };
    }

    let phones = [];
    let assistant = null;
    const errors = [];
    try {
      const list = await vapiFetch('/phone-number');
      phones = Array.isArray(list) ? list : (list?.results || list?.phoneNumbers || []);
    } catch (err) {
      errors.push({ step: 'list_phones', error: err.message, status: err.status });
    }
    if (assistantId) {
      try {
        assistant = await vapiFetch(`/assistant/${assistantId}`);
      } catch (err) {
        errors.push({ step: 'get_assistant', error: err.message, status: err.status });
      }
    }

    const phoneRows = phones.map((p) => {
      const serverUrl = p?.server?.url || p?.serverUrl || null;
      return {
        id: p?.id || null,
        number_masked: maskPhone(p?.number || p?.phoneNumber),
        name: p?.name || p?.label || null,
        assistant_id: p?.assistantId || null,
        server_url: serverUrl,
        webhook_matches_lifere: serverUrl === webhookUrl,
        provider: p?.provider || null,
      };
    });

    const assistantServer = assistant?.server?.url || assistant?.serverUrl || null;
    return {
      ok: errors.length === 0,
      env,
      webhook_url: webhookUrl,
      assistant: assistantId
        ? {
            id: assistantId,
            name: assistant?.name || null,
            server_url: assistantServer,
            webhook_matches_lifere: assistantServer === webhookUrl,
          }
        : null,
      phones: phoneRows,
      preferred_phone_id: preferredPhoneId,
      twilio_from_masked: maskPhone(process.env.TWILIO_PHONE_NUMBER || process.env.ADAM_SMS_NUMBER),
      errors,
      next: phoneRows.some((p) => !p.webhook_matches_lifere) || (assistant && !assistantServer?.includes('/lifere/receptionist/vapi-end'))
        ? 'POST /api/v1/lifere/phone/sync-vapi to point Vapi server URL at LifeRE'
        : 'Call the Vapi number — ended calls should land in Ops inbox',
      label: 'KNOW',
    };
  }

  async function syncVapiWebhooksToLifeRE() {
    const inspected = await inspectVapiPhoneSystem();
    if (!process.env.VAPI_API_KEY) return inspected;

    const webhookUrl = lifeReVapiWebhookUrl();
    const secret = process.env.VAPI_WEBHOOK_SECRET || process.env.VAPI_SECRET || undefined;
    const serverPayload = secret
      ? { server: { url: webhookUrl, secret } }
      : { server: { url: webhookUrl } };
    // Older Vapi fields still accepted on some accounts
    const legacyPayload = secret
      ? { serverUrl: webhookUrl, serverUrlSecret: secret }
      : { serverUrl: webhookUrl };

    const actions = [];
    const assistantId = process.env.VAPI_ASSISTANT_ID;
    if (assistantId) {
      try {
        await vapiFetch(`/assistant/${assistantId}`, {
          method: 'PATCH',
          body: { ...serverPayload, ...legacyPayload },
        });
        actions.push({ target: 'assistant', id: assistantId, ok: true, webhook_url: webhookUrl });
      } catch (err) {
        try {
          await vapiFetch(`/assistant/${assistantId}`, { method: 'PATCH', body: legacyPayload });
          actions.push({ target: 'assistant', id: assistantId, ok: true, via: 'legacy_fields', webhook_url: webhookUrl });
        } catch (err2) {
          actions.push({ target: 'assistant', id: assistantId, ok: false, error: err2.message });
        }
      }
    }

    let phones = [];
    try {
      const list = await vapiFetch('/phone-number');
      phones = Array.isArray(list) ? list : (list?.results || list?.phoneNumbers || []);
    } catch (err) {
      actions.push({ target: 'list_phones', ok: false, error: err.message });
    }

    // Patch every Vapi number's server URL so inbound (any line) lands in LifeRE.
    // Do not overwrite an existing assistantId on a number — only attach default if missing.
    for (const phone of phones) {
      if (!phone?.id) continue;
      try {
        await vapiFetch(`/phone-number/${phone.id}`, {
          method: 'PATCH',
          body: {
            ...serverPayload,
            ...legacyPayload,
            ...(assistantId && !phone.assistantId ? { assistantId } : {}),
          },
        });
        actions.push({
          target: 'phone',
          id: phone.id,
          number_masked: maskPhone(phone.number || phone.phoneNumber),
          ok: true,
          webhook_url: webhookUrl,
        });
      } catch (err) {
        actions.push({
          target: 'phone',
          id: phone.id,
          number_masked: maskPhone(phone.number || phone.phoneNumber),
          ok: false,
          error: err.message,
        });
      }
    }

    const after = await inspectVapiPhoneSystem();
    return {
      ok: actions.every((a) => a.ok !== false) && after.ok,
      synced: true,
      webhook_url: webhookUrl,
      actions,
      status: after,
      label: 'KNOW',
    };
  }

  async function ingestVapiCallEnded({ callData, userId = 'adam', tenantId = 'default' }) {
    const transcript = callData?.transcript || callData?.analysis?.summary || '';
    const intentMatch = /buy|sell|list|invest|relocat/i.exec(transcript);
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
        lead_score: callData?.status === 'completed' || callData?.status === 'ended' ? 'warm' : 'unknown',
        transcript_excerpt: transcript.slice(0, 500),
        vapi: true,
      },
    });
  }

  async function handleVapiWebhook({ body = {}, userId = 'adam', tenantId = 'default' } = {}) {
    const normalized = normalizeVapiWebhookBody(body);
    if (!normalized.should_ingest) {
      return {
        ok: true,
        ingested: false,
        type: normalized.type,
        note: 'Ack only — not an end-of-call event',
        label: 'KNOW',
      };
    }
    const result = await ingestVapiCallEnded({
      callData: normalized.callData,
      userId,
      tenantId,
    });
    return { ...result, ingested: true, type: normalized.type };
  }

  return {
    inboundSummary,
    listRecentCalls,
    listPhoneTextInbox,
    ingestVapiCallEnded,
    inspectVapiPhoneSystem,
    syncVapiWebhooksToLifeRE,
    handleVapiWebhook,
    normalizeVapiWebhookBody,
  };
}
