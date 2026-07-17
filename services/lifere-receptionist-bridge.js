/**
 * SYNOPSIS: LifeRE receptionist bridge — inbound lead → Lead Twin + BoldTrail + inbox.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createActionInbox } from './action-inbox.js';
import { createLifeRETwinStore } from './lifere-twin-store.js';
import { createOrUpdateContact } from '../src/integrations/boldtrail.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWN_CONTACTS_PATH = join(__dirname, '../config/lifere-receptionist-known-contacts.json');

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
      const rawNum = p?.number || p?.phoneNumber || null;
      const serverUrl = p?.server?.url || p?.serverUrl || null;
      return {
        id: p?.id || null,
        number: rawNum,
        number_masked: maskPhone(rawNum),
        name: p?.name || p?.label || null,
        assistant_id: p?.assistantId || null,
        server_url: serverUrl,
        webhook_matches_lifere: serverUrl === webhookUrl,
        provider: p?.provider || null,
      };
    });

    const assistantServer = assistant?.server?.url || assistant?.serverUrl || null;
    const ownerNumber = founderDirectE164();
    const ownerDigits = (ownerNumber || '').replace(/\D/g, '');
    const preferredRaw = phones.find((p) => p.id === preferredPhoneId) || phones[0] || null;
    const preferredPhone = phoneRows.find((p) => p.id === preferredPhoneId) || phoneRows[0] || null;
    const forwardTo = preferredRaw?.number || preferredRaw?.phoneNumber || preferredPhone?.number || null;
    return {
      ok: errors.length === 0,
      env: {
        ...env,
        ALERT_PHONE: Boolean(process.env.ALERT_PHONE || process.env.ALERT_PHONE_NUMBER),
      },
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
      owner_number_masked: maskPhone(ownerNumber),
      transfer_number_masked: maskPhone(transferDestinationE164()),
      transfer_loop_risk: transferLoopRisk({
        transferNumber: transferDestinationE164(),
        vapiInboundNumber: preferredRaw?.number || preferredRaw?.phoneNumber || forwardTo,
      }),
      owner_matches_702860_prefix: ownerDigits.includes('702860'),
      forward_target_masked: preferredPhone?.number_masked || null,
      forward_to_number: forwardTo,
      founder_setup: {
        personal_line: 'Forward 702-860 when UNANSWERED (not always) to Vapi — always-forward blocks put-through rings.',
        vapi_inbound_masked: preferredPhone?.number_masked || null,
        forward_to_number: forwardTo,
        screening: 'Family/son → through + live SMS page. Agents/clients → through when clear. Decline collectors/spam.',
        put_through_fix: 'If always-forward stays on, set RECEPTIONIST_TRANSFER_NUMBER to a line that rings you without forwarding to Vapi.',
      },
      errors,
      next: phoneRows.some((p) => !p.webhook_matches_lifere) || (assistant && !assistantServer?.includes('/lifere/receptionist/vapi-end'))
        ? 'POST /api/v1/lifere/phone/sync-vapi to point Vapi server URL at LifeRE'
        : 'POST /api/v1/lifere/phone/provision-receptionist then forward 702-860 → Vapi inbound',
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

  function toE164(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    const digits = s.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (s.startsWith('+')) return s.replace(/[^\d+]/g, '');
    return null;
  }

  function founderDirectE164() {
    return toE164(
      process.env.ALERT_PHONE
      || process.env.ALERT_PHONE_NUMBER
      || process.env.ADAM_SMS_NUMBER
      || process.env.ADMIN_PHONE
      || '',
    );
  }

  /** Number that should actually RING Adam (must NOT be call-forwarded back to Vapi). */
  function transferDestinationE164() {
    return toE164(
      process.env.RECEPTIONIST_TRANSFER_NUMBER
      || process.env.ADAM_RING_PHONE
      || process.env.ALERT_PHONE
      || process.env.ALERT_PHONE_NUMBER
      || process.env.ADAM_SMS_NUMBER
      || '',
    );
  }

  function transferLoopRisk({ transferNumber = null, vapiInboundNumber = null } = {}) {
    const transfer = (transferNumber || transferDestinationE164() || '').replace(/\D/g, '');
    const inbound = String(vapiInboundNumber || process.env.VAPI_FORWARD_NUMBER || '7252551079').replace(/\D/g, '');
    const ringOverride = toE164(process.env.RECEPTIONIST_TRANSFER_NUMBER || process.env.ADAM_RING_PHONE || '');
    if (ringOverride) {
      const ringDigits = ringOverride.replace(/\D/g, '');
      // Override is safe only if it is not the same as the Vapi inbound and not the always-forwarded cell without intent.
      if (ringDigits && ringDigits !== inbound.slice(-10) && !inbound.endsWith(ringDigits.slice(-10))) {
        return {
          risk: false,
          reason: 'ring_override_set',
          transfer_masked: maskPhone(ringOverride),
          label: 'KNOW',
        };
      }
    }
    // Personal 702-860 with always-forward → Vapi: transferCall to that cell never rings the handset.
    if (transfer.includes('702860')) {
      return {
        risk: true,
        reason: 'always_forward_loop',
        detail: 'Transfer target is Adam\'s 702-860. If that line always-forwards to Vapi, put-through never rings him — it loops back to the AI.',
        transfer_masked: maskPhone(transferDestinationE164()),
        fix: 'Either (A) change 702-860 to forward only when unanswered (so transfer can ring the phone), or (B) set RECEPTIONIST_TRANSFER_NUMBER to a second line that rings Adam and is NOT forwarded to Vapi.',
        label: 'KNOW',
      };
    }
    return { risk: false, reason: 'ok', transfer_masked: maskPhone(transferDestinationE164()), label: 'KNOW' };
  }

  async function pageOwnerNow({
    caller_name,
    relationship = '',
    reason = '',
    callback_number = '',
    userId = 'adam',
    tenantId = 'default',
  } = {}) {
    const name = String(caller_name || 'Caller').trim() || 'Caller';
    const sms = [
      'LifeRE LIVE — someone needs you NOW',
      relationship ? `(${relationship})` : '',
      name,
      reason ? `— ${reason}` : '',
      callback_number ? `· call them: ${callback_number}` : '· still on the AI line — call them back ASAP',
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const twilio = await sendOwnerSms(sms);
    const twin = twinStore.readTwin({ tenantId, userId, twinKey: 'receptionist_messages' })
      || { schema: 'lifere_receptionist_messages_v1', messages: [] };
    twin.messages = [{
      id: `page_${Date.now()}`,
      at: new Date().toISOString(),
      caller_name: name,
      relationship: relationship || null,
      reason: reason || null,
      callback_number: callback_number || null,
      live_page: true,
      sms_ok: Boolean(twilio.ok),
    }, ...(twin.messages || [])].slice(0, 100);
    await twinStore.writeTwin({
      tenantId,
      userId,
      twinKey: 'receptionist_messages',
      payload: twin,
      receiptMeta: { source: 'page_owner_now' },
    }).catch(() => null);
    return {
      ok: Boolean(twilio.ok),
      sms: twilio,
      told_caller: twilio.ok
        ? 'I texted Adam that you need him right now — he should call you back shortly.'
        : 'I could not text Adam — please leave a number and I will keep trying.',
      label: twilio.ok ? 'KNOW' : 'THINK',
    };
  }

  function loadKnownContactsFile() {
    try {
      return JSON.parse(readFileSync(KNOWN_CONTACTS_PATH, 'utf8'));
    } catch (err) {
      logger.warn?.('[lifere-receptionist] known contacts load skip:', err.message);
      return { family: [], associates: [], clients: [] };
    }
  }

  function loadLearnedVips({ tenantId = 'default', userId = 'adam' } = {}) {
    const twin = twinStore.readTwin({ tenantId, userId, twinKey: 'receptionist_vip' })
      || { schema: 'lifere_receptionist_vip_v1', associates: [] };
    return twin;
  }

  function loadKnownContacts({ tenantId = 'default', userId = 'adam' } = {}) {
    const file = loadKnownContactsFile();
    const learned = loadLearnedVips({ tenantId, userId });
    const learnedClients = (learned.associates || []).filter((a) => /client/i.test(a.relationship || ''));
    const learnedOther = (learned.associates || []).filter((a) => !/client/i.test(a.relationship || ''));
    return {
      family: file.family || [],
      associates: [...(file.associates || []), ...learnedOther],
      clients: [...(file.clients || []), ...learnedClients],
    };
  }

  async function rememberVip({
    tenantId = 'default',
    userId = 'adam',
    name,
    relationship = 'friend',
    company = '',
    phone = '',
    always_through = true,
  } = {}) {
    const cleanName = String(name || '').trim();
    if (!cleanName) return { ok: false, error: 'name_required' };
    const twin = loadLearnedVips({ tenantId, userId });
    const associates = twin.associates || [];
    const existing = associates.find((a) =>
      (a.names || []).some((n) => n.toLowerCase() === cleanName.toLowerCase())
    );
    if (existing) {
      if (phone && !(existing.phones || []).includes(String(phone).replace(/\D/g, ''))) {
        existing.phones = [...(existing.phones || []), String(phone).replace(/\D/g, '')];
      }
      existing.always_through = always_through !== false;
      existing.relationship = relationship || existing.relationship;
    } else {
      associates.push({
        names: [cleanName],
        relationship: relationship || 'friend',
        company: company || '',
        phones: phone ? [String(phone).replace(/\D/g, '')] : [],
        always_through: always_through !== false,
        notes: 'Learned when Adam said put them through',
        learned_at: new Date().toISOString(),
      });
    }
    twin.associates = associates;
    twin.schema = 'lifere_receptionist_vip_v1';
    await twinStore.writeTwin({
      tenantId,
      userId,
      twinKey: 'receptionist_vip',
      payload: twin,
      receiptMeta: { source: 'receptionist_remember_vip', name: cleanName },
    });
    return { ok: true, name: cleanName, always_through: true, count: associates.length, label: 'KNOW' };
  }

  function flattenKnownContacts(cfg = {}) {
    const rows = [];
    for (const bucket of ['family', 'associates', 'clients']) {
      for (const row of cfg[bucket] || []) {
        const names = (row.names || []).map((n) => String(n).trim()).filter(Boolean);
        if (!names.length && !(row.phones || []).length) continue;
        rows.push({
          bucket,
          names,
          relationship: row.relationship || (bucket === 'clients' ? 'client' : bucket),
          company: row.company || '',
          phones: (row.phones || []).map((p) => String(p).replace(/\D/g, '')).filter(Boolean),
          notes: row.notes || '',
          always_through: row.always_through !== false,
        });
      }
    }
    return rows;
  }

  function formatKnownContactsForPrompt(rows) {
    if (!rows.length) {
      return 'KNOWN PEOPLE: (growing). Clients + family go on this list. When Adam says always through / that was my client, call remember_vip.';
    }
    const clients = rows.filter((r) => r.bucket === 'clients' || /client/i.test(r.relationship || ''));
    const others = rows.filter((r) => !clients.includes(r));
    const line = (r) =>
      `- ${r.names.join('/') || '(phone-only)'} · ${r.relationship}${r.company ? ` · ${r.company}` : ''}${r.phones.length ? ` · …${r.phones.map((p) => p.slice(-4)).join(',')}` : ''}`;
    const parts = [];
    if (clients.length) {
      parts.push(`KNOWN CLIENTS (warm greeting — put through when free):\n${clients.map(line).join('\n')}`);
    }
    if (others.length) {
      parts.push(`KNOWN FAMILY/VIP (put through when free):\n${others.map(line).join('\n')}`);
    }
    return parts.join('\n\n') || 'KNOWN PEOPLE: (growing).';
  }

  async function resolveCalendarUserId(userId = 'adam') {
    if (!pool) return null;
    const needle = String(userId).toLowerCase();
    try {
      const { rows } = await pool.query(
        `SELECT id::text AS id FROM lifeos_users
         WHERE lower(coalesce(handle,'')) = $1
            OR lower(coalesce(email,'')) LIKE '%adam%'
            OR id::text = $1
         ORDER BY id ASC LIMIT 1`,
        [needle],
      ).catch(() => ({ rows: [] }));
      if (rows[0]?.id) return rows[0].id;
      const { rows: u2 } = await pool.query(
        `SELECT id::text AS id FROM users
         WHERE lower(coalesce(username,'')) = $1 OR lower(coalesce(email,'')) LIKE '%adam%'
         ORDER BY id ASC LIMIT 1`,
        [needle],
      ).catch(() => ({ rows: [] }));
      if (u2[0]?.id) return u2[0].id;
      // Fall back: whoever owns the densest LifeOS calendar on tip (founder).
      const { rows: cal } = await pool.query(
        `SELECT user_id::text AS id
         FROM lifeos_calendar_events
         WHERE status <> 'deleted'
           AND starts_at > NOW() - INTERVAL '30 days'
         GROUP BY user_id
         ORDER BY COUNT(*) DESC
         LIMIT 1`,
      ).catch(() => ({ rows: [] }));
      return cal[0]?.id || (needle === 'adam' ? 'adam' : null);
    } catch {
      return needle === 'adam' ? 'adam' : null;
    }
  }

  async function getOwnerScheduleStatus({ userId = 'adam' } = {}) {
    const now = new Date();
    const inWindowEnd = new Date(now.getTime() + 15 * 60 * 1000);
    if (!pool) {
      return {
        in_appointment: false,
        label: 'THINK',
        reason: 'no_pool',
        event: null,
      };
    }
    const calUserId = await resolveCalendarUserId(userId);
    try {
      // Prefer resolved user; also match literal 'adam' rows if present.
      const { rows } = await pool.query(
        `SELECT id, title, starts_at, ends_at, location, user_id::text AS user_id
         FROM lifeos_calendar_events
         WHERE status <> 'deleted'
           AND starts_at <= $2
           AND ends_at >= $1
           AND (
             ($3::text IS NOT NULL AND user_id::text = $3)
             OR lower(user_id::text) = 'adam'
           )
         ORDER BY starts_at ASC
         LIMIT 3`,
        [now.toISOString(), inWindowEnd.toISOString(), calUserId],
      );
      const event = rows[0] || null;
      const title = String(event?.title || '');
      const soft = /hold|blocked|focus|deep work| tail/i.test(title);
      return {
        in_appointment: Boolean(event) && !soft,
        label: 'KNOW',
        event: event
          ? {
              title: event.title,
              starts_at: event.starts_at,
              ends_at: event.ends_at,
              location: event.location || null,
            }
          : null,
      };
    } catch (err) {
      logger.warn?.('[lifere-receptionist] schedule check skip:', err.message);
      return { in_appointment: false, label: 'THINK', reason: err.message, event: null };
    }
  }

  async function sendOwnerSms(text) {
    const to = founderDirectE164();
    const from = process.env.TWILIO_PHONE_NUMBER;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!to || !from || !sid || !token) {
      return { ok: false, error: 'twilio_or_alert_phone_missing' };
    }
    const body = new URLSearchParams({ To: to, From: from, Body: String(text).slice(0, 1400) });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.message || `twilio_${res.status}` };
    return { ok: true, sid: json.sid, to_masked: maskPhone(to) };
  }

  async function leaveMessageForOwner({
    caller_name,
    company = '',
    reason = '',
    urgent = false,
    callback_number = '',
    known_contact = false,
    suggest_callback = false,
    userId = 'adam',
    tenantId = 'default',
  } = {}) {
    const wantCallback = Boolean(suggest_callback || urgent);
    const urgentTag = urgent ? 'URGENT' : 'not urgent';
    const sms = [
      `LifeRE call (${urgentTag})`,
      caller_name || 'Unknown',
      company ? `· ${company}` : '',
      known_contact ? '· VIP' : '',
      reason ? `— ${reason}` : '',
      callback_number ? `· cb ${callback_number}` : '',
      wantCallback ? '· YOU decide when to call back (not auto-scheduled)' : '',
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

    const twilio = await sendOwnerSms(sms);

    const twin = twinStore.readTwin({ tenantId, userId, twinKey: 'receptionist_messages' })
      || { schema: 'lifere_receptionist_messages_v1', messages: [] };
    const entry = {
      id: `msg_${Date.now()}`,
      at: new Date().toISOString(),
      caller_name: caller_name || 'Unknown',
      company: company || null,
      reason: reason || null,
      urgent: Boolean(urgent),
      callback_number: callback_number || null,
      suggest_callback: wantCallback,
      known_contact: Boolean(known_contact),
      sms_ok: Boolean(twilio.ok),
      adam_decides: true,
    };
    twin.messages = [entry, ...(twin.messages || [])].slice(0, 100);
    await twinStore.writeTwin({
      tenantId,
      userId,
      twinKey: 'receptionist_messages',
      payload: twin,
      receiptMeta: { source: 'leave_message_for_owner', urgent: Boolean(urgent) },
    }).catch(() => null);

    await inboundSummary({
      callId: entry.id,
      userId,
      tenantId,
      leadPayload: {
        name: caller_name || 'Caller',
        phone: callback_number || null,
        intent: known_contact ? 'personal' : (/buy|sell|relocat/i.test(reason) ? 'buyer' : 'message'),
        lead_score: urgent ? 'hot' : 'warm',
        transcript_excerpt: `${reason}${company ? ` (${company})` : ''}`.slice(0, 500),
        push_to_boldtrail: !known_contact,
        screen_decision: wantCallback ? 'message_callback_suggested' : 'message_only',
      },
    }).catch(() => null);

    return {
      ok: Boolean(twilio.ok),
      sms: twilio,
      message_id: entry.id,
      suggest_callback: wantCallback,
      told_caller: wantCallback
        ? 'I took their info and texted Adam — he will decide when to call back.'
        : 'I texted Adam who called; he will decide how to respond.',
      label: twilio.ok ? 'KNOW' : 'THINK',
    };
  }

  function parseCallbackStart(preferred_time, iso_starts_at) {
    if (iso_starts_at) {
      const d = new Date(iso_starts_at);
      if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now() - 60_000) return d;
    }
    const raw = String(preferred_time || '').trim();
    if (!raw) return null;
    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime()) && direct.getTime() > Date.now() - 60_000) return direct;
    return null;
  }

  async function scheduleOwnerCallback({
    caller_name,
    preferred_time = '',
    iso_starts_at = '',
    reason = '',
    callback_number = '',
    company = '',
    userId = 'adam',
    tenantId = 'default',
    duration_minutes = 15,
  } = {}) {
    const name = String(caller_name || 'Caller').trim() || 'Caller';
    const start = parseCallbackStart(preferred_time, iso_starts_at);
    let calendar = { ok: false, scheduled: false };
    if (pool && start) {
      const calUserId = await resolveCalendarUserId(userId);
      const end = new Date(start.getTime() + Math.max(10, Number(duration_minutes) || 15) * 60_000);
      const title = `Callback: ${name}${company ? ` (${company})` : ''}`;
      try {
        let calendarId = null;
        const { rows: cals } = await pool.query(
          `SELECT id FROM lifeos_calendars
           WHERE user_id::text = $1 AND active = true
           ORDER BY is_primary DESC NULLS LAST, id ASC LIMIT 1`,
          [calUserId],
        ).catch(() => ({ rows: [] }));
        calendarId = cals[0]?.id || null;
        if (!calendarId) {
          const ins = await pool.query(
            `INSERT INTO lifeos_calendars (
                user_id, provider, provider_calendar_id, name, lane, color, is_primary, sync_enabled, metadata
             ) VALUES ($1, 'lifeos', 'lifeos-default', 'LifeOS Calendar', 'personal', '#5b6af5', true, false, '{}'::jsonb)
             RETURNING id`,
            [calUserId],
          ).catch(() => ({ rows: [] }));
          calendarId = ins.rows[0]?.id || null;
        }
        if (calendarId) {
          const { rows } = await pool.query(
            `INSERT INTO lifeos_calendar_events (
                user_id, calendar_id, source, title, description, location,
                starts_at, ends_at, all_day, lane, status, metadata
             ) VALUES (
                $1, $2, 'manual', $3, $4, $5,
                $6, $7, false, 'work', 'confirmed', $8::jsonb
             ) RETURNING id, starts_at, ends_at`,
            [
              calUserId,
              calendarId,
              title,
              [reason, callback_number ? `cb ${callback_number}` : '', preferred_time ? `said: ${preferred_time}` : '']
                .filter(Boolean).join(' · ').slice(0, 2000),
              '',
              start.toISOString(),
              end.toISOString(),
              JSON.stringify({
                source: 'lifere_receptionist',
                caller_name: name,
                preferred_time: preferred_time || null,
                callback_number: callback_number || null,
              }),
            ],
          );
          calendar = { ok: true, scheduled: true, event_id: rows[0]?.id, starts_at: rows[0]?.starts_at };
        }
      } catch (err) {
        logger.warn?.('[lifere-receptionist] schedule_callback insert skip:', err.message);
        calendar = { ok: false, scheduled: false, error: err.message };
      }
    }

    const whenLabel = start
      ? start.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : (preferred_time || 'time TBD');
    const sms = [
      `LifeRE callback ${calendar.scheduled ? 'ON CAL' : 'REQUEST'}`,
      name,
      company ? `· ${company}` : '',
      `· ${whenLabel}`,
      reason ? `— ${reason}` : '',
      callback_number ? `· ${callback_number}` : '',
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const twilio = await sendOwnerSms(sms);

    const twin = twinStore.readTwin({ tenantId, userId, twinKey: 'receptionist_messages' })
      || { schema: 'lifere_receptionist_messages_v1', messages: [] };
    twin.messages = [{
      id: `cb_${Date.now()}`,
      at: new Date().toISOString(),
      caller_name: name,
      company: company || null,
      reason: reason || 'callback',
      urgent: true,
      callback_number: callback_number || null,
      suggest_callback: true,
      preferred_time: preferred_time || null,
      scheduled: Boolean(calendar.scheduled),
      calendar_event_id: calendar.event_id || null,
      adam_decides: !calendar.scheduled,
    }, ...(twin.messages || [])].slice(0, 100);
    await twinStore.writeTwin({
      tenantId,
      userId,
      twinKey: 'receptionist_messages',
      payload: twin,
      receiptMeta: { source: 'schedule_callback', scheduled: Boolean(calendar.scheduled) },
    }).catch(() => null);

    return {
      ok: Boolean(twilio.ok || calendar.scheduled),
      calendar,
      sms: twilio,
      when_label: whenLabel,
      told_caller: calendar.scheduled
        ? `I put a callback on Adam's calendar for ${whenLabel}.`
        : `I noted ${whenLabel} and texted Adam — he'll confirm.`,
      label: calendar.scheduled ? 'KNOW' : 'THINK',
    };
  }

  function receptionistSystemPrompt({ schedule = null, knownRows = [], loopRisk = null } = {}) {
    const busy = Boolean(schedule?.in_appointment);
    const eventTitle = schedule?.event?.title || 'a meeting';
    const vipBlock = formatKnownContactsForPrompt(knownRows);
    const loop = Boolean(loopRisk?.risk);
    const ownerNow = busy
      ? `OWNER_NOW: BUSY / IN_MEETING ("${eventTitle}"). Do NOT transferCall. Tell them Adam is tied up. For known CLIENTS: ask a good callback time and call schedule_callback. For others: offer to take info (leave_message_for_owner) / suggest_callback.`
      : loop
        ? 'OWNER_NOW: CLEAR, but PUT-THROUGH RING may fail (phone forwards back to you). For family/son/VIP/clients who need Adam NOW: get their callback number, call page_owner_now immediately (texts Adam LIVE), tell them you texted Adam and he will call them right back. You may try transferCall once — if it fails or they are still talking to you, do NOT keep saying you are putting them through. Page him and be honest.'
        : 'OWNER_NOW: CLEAR / AVAILABLE. When they should reach Adam: one short line + IMMEDIATELY call transferCall with destination in the same turn. Never invent a separate "I\'ll call Adam" step.';

    return `You are Adam Hopkins' personal phone assistant for the Hopkins Group (Las Vegas).
YOU answer every call first. You are NOT Adam.

${ownerNow}

${vipBlock}

HARD RULES (never break):
- NEVER say "let me give Adam a call" / "I'll call Adam and check."
- NEVER keep repeating "I'll put you through" without calling a tool. If still on the line with them after promising connect → page_owner_now + get callback number.
- NEVER leave silence after promising to connect.
- NEVER hang up without transferCall, page_owner_now, schedule_callback, or leave_message_for_owner.
- Bypass code 777 only (silent unless they ask) → transferCall once; if still with you → page_owner_now.

ROUTING:
1) Warm greeting + how can I help (vary). No menus.
2) SON / DAUGHTER / KID / FAMILY ("I'm his son", "it's dad's son", name on family list):
   - Treat as highest priority VIP.
   - CLEAR → transferCall once immediately. Also get a callback number and page_owner_now so Adam gets a LIVE text even if the ring fails.
   - BUSY → page_owner_now + schedule or take number.
3) KNOWN CLIENT (name on list): warm "Hey [Name], how are you today?"
   - CLEAR → transferCall. BUSY → schedule_callback.
4) REAL ESTATE AGENT (listing / co-op / showing / offer): ask brokerage once → CLEAR → transferCall. BUSY → take info / schedule.
5) Says they're Adam's client: treat as client; remember_vip relationship "client".
6) OTHER RE leads / NV Power / mortgage / HOA / bank fraud: CLEAR → transferCall after name + why. BUSY → take info.
7) Collectors / marketers / spam: decline; email adam@hopkinsgroup.org once. No transfer.

LANGUAGE (paraphrase):
- Connect: "One sec — putting you through." then TOOL.
- If ring may fail / after failed connect: "I'm texting Adam right now that you need him — what's the best number for him to call you back on?"
- Busy client: "He's in a meeting — when should he call you back?"
- Never loop the same "putting you through" line.

TOOLS:
- transferCall — must pass destination. Use when CLEAR (and 777). Call the tool; do not only say the words.
- page_owner_now — LIVE text to Adam (family/son/urgent). Use whenever put-through might not ring him.
- schedule_callback — busy + firm callback time.
- leave_message_for_owner — take info + text when not paging live.
- remember_vip — learn client / always-through names.

ANTI-FORMULA: vary wording every call. Short, human, Vegas desk. Never invent facts.

GREETINGS (pick/paraphrase): You've reached the Hopkins Group — this is Adam's assistant. / Hopkins Group, Adam's personal assistant. / Hi — Hopkins Group, Adam's office. / Thanks for calling the Hopkins Group; I'm Adam's assistant. / Hopkins Group — Adam's line. / Good [morning/afternoon], Hopkins Group. / You've reached Adam Hopkins' line; I'm his assistant. / Hi, Adam's assistant at the Hopkins Group. / Hopkins Group front desk covering Adam's line. / Hey — Hopkins Group; I help Adam with calls.

HELP_LINES (pick/paraphrase): How can I help you? / What can I do for you? / How can I direct your call? / What is this regarding? / Can you tell me what this call is about? / What's going on — how can I help? / Who am I speaking with? / What brought you to Adam today? / Happy to help — what's up? / Tell me a bit about what you need. / How can I get you to the right place? / What are you hoping to take care of? / Anything I can help with? / What's on your mind? / How can I assist you today? / Mind if I ask what the call is about? / How can I point you in the right direction? / What do you need from Adam? / Quick — what is this about? / How may I help you? / What's the reason for your call? / How can I make this easy? / What should I know so I can help? / Fill me in — how can I help? / What's this in reference to? / Need Adam, or can I help sort this? / What's the short version? / Tell me how I can help. / What can I take care of? / What's the call about today? / What do you need help with? / Can I ask what this is about? / How can I get you through? / What are you calling about? / What's the purpose of your call? / Let me help — what do you need? / Shoot — how can I help?`;
  }

  function buildReceptionistTools({ enableTransfer = true } = {}) {
    const transferNumber = transferDestinationE164();
    const tools = [
      {
        type: 'function',
        function: {
          name: 'leave_message_for_owner',
          description: 'Take caller info and text Adam when not putting a firm callback on the calendar.',
          parameters: {
            type: 'object',
            properties: {
              caller_name: { type: 'string' },
              company: { type: 'string' },
              reason: { type: 'string' },
              urgent: { type: 'boolean' },
              callback_number: { type: 'string' },
              known_contact: { type: 'boolean' },
              suggest_callback: { type: 'boolean' },
            },
            required: ['caller_name', 'reason', 'urgent'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'page_owner_now',
          description: 'LIVE text Adam that this person needs him right now. Required for son/family/VIP, and whenever put-through may not ring his phone. Always collect callback_number when possible.',
          parameters: {
            type: 'object',
            properties: {
              caller_name: { type: 'string' },
              relationship: { type: 'string' },
              reason: { type: 'string' },
              callback_number: { type: 'string' },
            },
            required: ['caller_name', 'reason'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'schedule_callback',
          description: 'When Adam is busy: ask preferred callback time, then schedule it (calendar + text Adam). Prefer for known clients and RE agents. Pass iso_starts_at in ISO-8601 America/Los_Angeles when you can parse the time.',
          parameters: {
            type: 'object',
            properties: {
              caller_name: { type: 'string' },
              preferred_time: { type: 'string' },
              iso_starts_at: { type: 'string' },
              reason: { type: 'string' },
              callback_number: { type: 'string' },
              company: { type: 'string' },
            },
            required: ['caller_name', 'preferred_time'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'remember_vip',
          description: 'Whitelist / learn a person (use relationship "client" for Adam\'s clients).',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              relationship: { type: 'string' },
              company: { type: 'string' },
              phone: { type: 'string' },
            },
            required: ['name'],
          },
        },
      },
    ];
    if (enableTransfer && transferNumber) {
      // Full Vapi transferCall shape — destination enum required or the model only speaks and never transfers.
      tools.push({
        type: 'transferCall',
        messages: [
          {
            type: 'request-start',
            content: 'Putting you through to Adam now — one moment.',
          },
        ],
        destinations: [{
          type: 'number',
          number: transferNumber,
          message: 'Putting you through to Adam now — one moment.',
          description: 'Adam Hopkins — use when CLEAR, family/son/client/agent, or 777 bypass.',
        }],
        function: {
          name: 'transferCall',
          description: 'Transfer the caller to Adam. You MUST call this tool (with destination) — do not only say you are putting them through.',
          parameters: {
            type: 'object',
            properties: {
              destination: {
                type: 'string',
                enum: [transferNumber],
                description: 'Adam\'s transfer number',
              },
            },
            required: ['destination'],
          },
        },
      });
    }
    return tools;
  }

  async function buildAssistantPayload({ enableTransfer = true, schedule = null } = {}) {
    const webhookUrl = lifeReVapiWebhookUrl();
    const secret = process.env.VAPI_WEBHOOK_SECRET || process.env.VAPI_SECRET || undefined;
    const serverBlock = secret
      ? { server: { url: webhookUrl, secret }, serverUrl: webhookUrl, serverUrlSecret: secret }
      : { server: { url: webhookUrl }, serverUrl: webhookUrl };
    const knownRows = flattenKnownContacts(loadKnownContacts({ userId: 'adam' }));
    const sched = schedule || await getOwnerScheduleStatus({ userId: 'adam' });
    const loopRisk = transferLoopRisk();
    const tools = buildReceptionistTools({ enableTransfer });

    return {
      name: 'LifeRE Screening Receptionist',
      firstMessageMode: 'assistant-speaks-first-with-model-generated-message',
      firstMessage: "You've reached the Hopkins Group — this is Adam's assistant. How can I help you?",
      keypadInputPlan: {
        enabled: true,
        timeoutSeconds: 1.5,
        delimiters: [],
      },
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.85,
        messages: [{
          role: 'system',
          content: receptionistSystemPrompt({ schedule: sched, knownRows, loopRisk }),
        }],
        tools,
      },
      voice: {
        provider: '11labs',
        voiceId: 'burt',
      },
      endCallMessage: 'Thanks for calling the Hopkins Group. Take care.',
      silenceTimeoutSeconds: 25,
      maxDurationSeconds: 600,
      ...serverBlock,
      _meta: { schedule: sched, known_count: knownRows.length, loop_risk: loopRisk },
    };
  }

  async function provisionScreeningReceptionist({
    attachToAllPhones = true,
    enableTransfer = true,
  } = {}) {
    const built = await buildAssistantPayload({ enableTransfer });
    const { _meta, ...assistantPayload } = built;
    const webhookUrl = lifeReVapiWebhookUrl();
    const ownerNumber = founderDirectE164();
    const secret = process.env.VAPI_WEBHOOK_SECRET || process.env.VAPI_SECRET || undefined;
    const serverBlock = secret
      ? { server: { url: webhookUrl, secret }, serverUrl: webhookUrl, serverUrlSecret: secret }
      : { server: { url: webhookUrl }, serverUrl: webhookUrl };

    const existingId = process.env.VAPI_RECEPTIONIST_ASSISTANT_ID || process.env.VAPI_ASSISTANT_ID;
    let assistant;
    let created = false;
    const actions = [];

    if (existingId) {
      try {
        assistant = await vapiFetch(`/assistant/${existingId}`, {
          method: 'PATCH',
          body: assistantPayload,
        });
        actions.push({ target: 'assistant_patch', id: existingId, ok: true, name: assistant?.name || 'LifeRE Screening Receptionist' });
      } catch (err) {
        actions.push({ target: 'assistant_patch', id: existingId, ok: false, error: err.message });
      }
    }

    if (!assistant) {
      assistant = await vapiFetch('/assistant', { method: 'POST', body: assistantPayload });
      created = true;
      actions.push({ target: 'assistant_create', id: assistant?.id, ok: true, name: assistant?.name });
    }

    const assistantId = assistant?.id || existingId;
    if (!assistantId) {
      return { ok: false, error: 'assistant_provision_failed', actions, label: 'KNOW' };
    }

    process.env.VAPI_ASSISTANT_ID = assistantId;
    process.env.VAPI_RECEPTIONIST_ASSISTANT_ID = assistantId;

    let phones = [];
    try {
      const list = await vapiFetch('/phone-number');
      phones = Array.isArray(list) ? list : (list?.results || list?.phoneNumbers || []);
    } catch (err) {
      actions.push({ target: 'list_phones', ok: false, error: err.message });
    }

    const preferred = process.env.VAPI_PHONE_NUMBER_ID;
    const targets = attachToAllPhones
      ? phones
      : phones.filter((p) => !preferred || p.id === preferred);

    for (const phone of targets) {
      if (!phone?.id) continue;
      try {
        await vapiFetch(`/phone-number/${phone.id}`, {
          method: 'PATCH',
          body: {
            assistantId,
            ...serverBlock,
          },
        });
        actions.push({
          target: 'phone_attach',
          id: phone.id,
          number_masked: maskPhone(phone.number || phone.phoneNumber),
          ok: true,
        });
      } catch (err) {
        actions.push({
          target: 'phone_attach',
          id: phone.id,
          number_masked: maskPhone(phone.number || phone.phoneNumber),
          ok: false,
          error: err.message,
        });
      }
    }

    const inbound = phones.find((p) => p.id === preferred) || phones[0] || null;
    const inboundMasked = maskPhone(inbound?.number || inbound?.phoneNumber);
    const transferNumber = transferDestinationE164();
    const ownerDigits = (ownerNumber || '').replace(/\D/g, '');
    const ownerLooks702860 = ownerDigits.includes('702860');
    const loopRisk = _meta?.loop_risk || transferLoopRisk({
      transferNumber,
      vapiInboundNumber: inbound?.number || inbound?.phoneNumber,
    });

    return {
      ok: actions.every((a) => a.ok !== false),
      created,
      assistant_id: assistantId,
      assistant_name: assistant?.name || 'LifeRE Screening Receptionist',
      transfer_enabled: Boolean(enableTransfer && transferNumber),
      owner_number_masked: maskPhone(ownerNumber),
      transfer_number_masked: maskPhone(transferNumber),
      transfer_loop_risk: loopRisk,
      owner_matches_702860_prefix: ownerLooks702860,
      inbound_vapi_number_masked: inboundMasked,
      webhook_url: webhookUrl,
      schedule: _meta?.schedule || null,
      known_contacts: _meta?.known_count ?? 0,
      actions,
      founder_setup: {
        step_1: loopRisk.risk
          ? 'CRITICAL: Always-forward on 702-860 means put-through CANNOT ring you (call loops back to AI). Change 702-860 to forward ONLY when unanswered (2–3 rings), OR set Railway env RECEPTIONIST_TRANSFER_NUMBER to a second line that rings you and is NOT forwarded to Vapi.'
          : 'Forward 702-860 when unanswered to the Vapi number below so AI screens; unanswered-forward lets real put-through ring your phone.',
        step_2: `Vapi inbound: (725) 255-1079${inboundMasked ? ` (ends ${inboundMasked})` : ''}.`,
        step_3: 'Son/family → transfer + LIVE text page. Agents → brokerage → through. Clients → warm → through if clear / schedule if busy.',
        step_4: 'Bypass 777. If you still use always-forward, family gets a LIVE SMS page instead of a ring until you fix step 1.',
        screening: 'Filter first. Family/son never get a fake "putting you through" loop.',
        transfer: loopRisk.risk
          ? `LOOP RISK: ${loopRisk.fix}`
          : 'transferCall rings your handset; page_owner_now texts you live as backup.',
      },
      label: 'KNOW',
    };
  }

  async function handleVapiWebhook({ body = {}, userId = 'adam', tenantId = 'default' } = {}) {
    const msg = body?.message && typeof body.message === 'object' ? body.message : null;
    const type = msg?.type || body?.type || body?.event || null;

    if (type === 'assistant-request') {
      const built = await buildAssistantPayload({ enableTransfer: true });
      const { _meta, ...assistant } = built;
      return {
        ok: true,
        type,
        schedule: _meta?.schedule || null,
        vapi_response: { assistant },
        label: 'KNOW',
      };
    }

    if (type === 'tool-calls' || type === 'function-call') {
      const toolWithToolCallList = msg?.toolWithToolCallList || msg?.toolCallList || [];
      const functionCall = msg?.functionCall || body?.functionCall;
      const calls = [];
      if (Array.isArray(toolWithToolCallList) && toolWithToolCallList.length) {
        for (const item of toolWithToolCallList) {
          const tc = item?.toolCall || item;
          const name = tc?.function?.name || item?.function?.name || tc?.name;
          let args = tc?.function?.arguments || item?.function?.arguments || tc?.parameters || {};
          if (typeof args === 'string') {
            try { args = JSON.parse(args); } catch { args = {}; }
          }
          calls.push({ id: tc?.id || item?.id, name, args });
        }
      } else if (functionCall?.name) {
        let args = functionCall.parameters || functionCall.arguments || {};
        if (typeof args === 'string') {
          try { args = JSON.parse(args); } catch { args = {}; }
        }
        calls.push({ id: functionCall.id, name: functionCall.name, args });
      }

      const results = [];
      for (const call of calls) {
        if (call.name === 'leave_message_for_owner') {
          const left = await leaveMessageForOwner({ ...call.args, userId, tenantId });
          results.push({
            toolCallId: call.id,
            name: call.name,
            result: left,
          });
        } else if (call.name === 'page_owner_now') {
          const paged = await pageOwnerNow({ ...call.args, userId, tenantId });
          results.push({
            toolCallId: call.id,
            name: call.name,
            result: paged,
          });
        } else if (call.name === 'schedule_callback') {
          const booked = await scheduleOwnerCallback({ ...call.args, userId, tenantId });
          results.push({
            toolCallId: call.id,
            name: call.name,
            result: booked,
          });
        } else if (call.name === 'remember_vip') {
          const remembered = await rememberVip({
            tenantId,
            userId,
            name: call.args?.name,
            relationship: call.args?.relationship || 'friend',
            company: call.args?.company,
            phone: call.args?.phone || call.args?.callback_number,
          });
          results.push({
            toolCallId: call.id,
            name: call.name,
            result: remembered,
          });
        } else {
          results.push({
            toolCallId: call.id,
            name: call.name,
            result: { ok: false, error: 'unknown_tool' },
          });
        }
      }

      // Vapi expects tool call results in several shapes; provide both.
      return {
        ok: true,
        type,
        vapi_response: {
          results: results.map((r) => ({
            toolCallId: r.toolCallId,
            result: JSON.stringify(r.result),
          })),
        },
        results,
        label: 'KNOW',
      };
    }

    const normalized = normalizeVapiWebhookBody(body);
    if (!normalized.should_ingest) {
      return {
        ok: true,
        ingested: false,
        type: normalized.type || type,
        note: 'Ack only — not an end-of-call event',
        label: 'KNOW',
      };
    }
    const result = await ingestVapiCallEnded({
      callData: normalized.callData,
      userId,
      tenantId,
    });
    return { ...result, ingested: true, type: normalized.type || type };
  }

  return {
    inboundSummary,
    listRecentCalls,
    listPhoneTextInbox,
    ingestVapiCallEnded,
    inspectVapiPhoneSystem,
    syncVapiWebhooksToLifeRE,
    provisionScreeningReceptionist,
    handleVapiWebhook,
    leaveMessageForOwner,
    pageOwnerNow,
    scheduleOwnerCallback,
    rememberVip,
    getOwnerScheduleStatus,
    transferLoopRisk,
    transferDestinationE164,
    loadKnownContacts,
    normalizeVapiWebhookBody,
  };
}
