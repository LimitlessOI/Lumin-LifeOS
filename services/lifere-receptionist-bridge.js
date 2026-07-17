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
      owner_matches_702860_prefix: ownerDigits.includes('702860'),
      forward_target_masked: preferredPhone?.number_masked || null,
      forward_to_number: forwardTo,
      founder_setup: {
        personal_line: 'Forward 702-860 (conditional / no-answer) to the Vapi inbound number below.',
        vapi_inbound_masked: preferredPhone?.number_masked || null,
        forward_to_number: forwardTo,
        screening: 'Always transfer: family, all RE leads, NV Power/mortgage. Decline: collectors + marketers.',
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

  function founderDirectE164() {
    const raw = process.env.ALERT_PHONE
      || process.env.ALERT_PHONE_NUMBER
      || process.env.ADAM_SMS_NUMBER
      || process.env.ADMIN_PHONE
      || '';
    const digits = String(raw).replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (String(raw).startsWith('+')) return String(raw).replace(/[^\d+]/g, '');
    return null;
  }

  function receptionistSystemPrompt() {
    return `You are Adam Hopkins' personal phone assistant for the Hopkins Group (Las Vegas real estate / LifeRE).
You are NOT Adam. Sound like a real person at a busy desk — warm, sharp, never scripted.

ANTI-FORMULA (critical):
- NEVER use the same greeting or "how can I help" wording twice in a row across calls if you can help it.
- Do NOT sound like a IVR menu or a chatbot. No "press 1" energy. No listing options (never say "is this real estate, personal, or a mortgage company?").
- Pick ONE greeting from GREETINGS and weave in ONE help-line from HELP_LINES (or a close paraphrase). Keep the whole open under ~8 seconds.
- Vary later lines too (personal ID ask, connecting, decline) — paraphrase, don't recite.

GREETINGS (pick one, or a natural paraphrase):
1) You've reached the Hopkins Group — this is Adam's assistant.
2) Hopkins Group, Adam's personal assistant speaking.
3) Hi there — you've got the Hopkins Group, Adam Hopkins' office.
4) Thanks for calling the Hopkins Group; I'm Adam's assistant.
5) Hopkins Group — Adam's line. This is his assistant.
6) Good [morning/afternoon] — Hopkins Group, Adam's assistant.
7) You've reached Adam Hopkins with the Hopkins Group; I'm his assistant.
8) Hi, this is Adam's assistant at the Hopkins Group.
9) Hopkins Group front desk — I'm covering Adam's line.
10) Hey, you've reached the Hopkins Group; I help Adam with his calls.

HELP_LINES (pick one after or combined with greeting — or a fresh paraphrase):
1) How can I help you?
2) What can I do for you?
3) How can I direct your call?
4) What is this regarding?
5) Can you tell me what this call is about?
6) What's going on — how can I help?
7) Who am I speaking with, and how can I help?
8) What brought you to Adam today?
9) Happy to help — what's up?
10) Tell me a bit about what you need.
11) How can I get you to the right place?
12) What are you hoping to take care of?
13) Is there something I can help with?
14) What's on your mind?
15) How can I assist you today?
16) What can I help you with on Adam's line?
17) Mind if I ask what the call is about?
18) How can I point you in the right direction?
19) What do you need from Adam?
20) Quick question — what is this call about?
21) How may I help you?
22) What's the reason for your call?
23) Anything I can help with?
24) How can I make this easy for you?
25) What should I know so I can help?
26) Who do we have and how can I help?
27) What can I help connect you for?
28) Fill me in — how can I help?
29) What's this in reference to?
30) How can I support you?
31) What are we working on today?
32) Need Adam, or can I help sort this?
33) What's the short version of why you're calling?
34) How can I get you what you need?
35) Tell me how I can help.
36) What can I take care of for you?
37) How can I best help?
38) What's the call about today?
39) Who am I helping, and with what?
40) What do you need help with?
41) Can I ask what this is about?
42) How can I steer this for you?
43) What's going on that I can help with?
44) What should I pass along — or how can I help?
45) How can I get you through?
46) What are you calling about?
47) How can I help from Adam's office?
48) What's the purpose of your call?
49) Let me help — what do you need?
50) Shoot — how can I help you?

OPENING FLOW:
- Greet + help-line only. Then listen. Let THEM say what it is. Then classify.

IF PERSONAL / FAMILY / FRIEND:
- Before transfer, light ID (vary wording). Intent: Adam asked you to know who you're connecting.
  Examples to paraphrase: "Of course — Adam likes me to know who I'm putting through; what's your name and how do you know him?" / "Happy to connect you — may I grab your name and how you're connected to Adam?" / "Sure thing — quick one: who am I speaking with?"
- "Corey's daughter" style answers are enough. Then transfer.

IF REAL ESTATE (any buyer/seller/relocate/referral/past client):
- Always transfer. Optional one-beat detail (name / buy vs sell / relocate) without a long interview.
- Connecting line: vary ("I'll get Adam for you" / "Let me put you through" / "Connecting you to Adam now").

IF THEY VOLUNTEER Nevada Power / NV Energy, mortgage/loan servicer, HOA, insurance claim, bank fraud:
- Confirm company in one beat, then transfer.

ALWAYS DECLINE (never transfer) — vary the wording, same meaning:
- Debt collectors / recovery / "outstanding balance" (mortgage company ≠ collector — that transfers).
- Marketers, SEO, Google listing, solar, warranty spam, robocalls, MLM, no clear purpose.
- Mention email at most once: adam@hopkinsgroup.org. End politely.

BEFORE EVERY TRANSFER:
- Warm-transfer: Adam hears a short brief first, then caller joins.
- Brief needs who + why (e.g. RE client buying / relocating; personal — Corey's daughter).
- Never invent facts, showings, or pricing.

UNSURE: one clarifying question; after two unclear answers, take name + callback + note, promise follow-up, end call.

STYLE: Conversational Vegas desk. Short sentences. Human first.`;
  }

  async function provisionScreeningReceptionist({
    attachToAllPhones = true,
    enableTransfer = true,
  } = {}) {
    const webhookUrl = lifeReVapiWebhookUrl();
    const ownerNumber = founderDirectE164();
    const secret = process.env.VAPI_WEBHOOK_SECRET || process.env.VAPI_SECRET || undefined;
    const serverBlock = secret
      ? { server: { url: webhookUrl, secret }, serverUrl: webhookUrl, serverUrlSecret: secret }
      : { server: { url: webhookUrl }, serverUrl: webhookUrl };

    const tools = [];
    if (enableTransfer && ownerNumber) {
      tools.push({
        type: 'transferCall',
        destinations: [{
          type: 'number',
          number: ownerNumber,
          message: 'Connecting you to Adam now — one moment.',
          description: 'Transfer after you know who they are and why. Adam gets a spoken brief first.',
          transferPlan: {
            mode: 'warm-transfer-wait-for-operator-to-speak-first-and-then-say-summary',
            summaryPlan: {
              enabled: true,
              messages: [
                {
                  role: 'system',
                  content: 'Speak to Adam only (caller cannot hear this). In 1–2 short sentences: who is calling, what they want, and any key detail (name, personal relationship, buy/sell/relocate, company). Start like: "Hey Adam —" Example: "Hey Adam — real estate client, interested in buying, relocating to Las Vegas." or "Hey Adam — personal call, Corey\'s daughter." Do not invent facts.',
                },
                {
                  role: 'user',
                  content: 'Call transcript:\n\n{{transcript}}\n\n',
                },
              ],
            },
          },
        }],
      });
    }

    const assistantPayload = {
      name: 'LifeRE Screening Receptionist',
      // Model picks a fresh greeting each call from the phrase banks (not one canned line).
      firstMessageMode: 'assistant-speaks-first-with-model-generated-message',
      firstMessage: "You've reached the Hopkins Group — this is Adam's assistant. How can I help you?",
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.85,
        messages: [{ role: 'system', content: receptionistSystemPrompt() }],
        tools: tools.length ? tools : undefined,
      },
      voice: {
        provider: '11labs',
        voiceId: 'burt',
      },
      endCallMessage: 'Thanks for calling the Hopkins Group. Take care.',
      silenceTimeoutSeconds: 25,
      maxDurationSeconds: 600,
      ...serverBlock,
    };

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
    const ownerDigits = (ownerNumber || '').replace(/\D/g, '');
    const ownerLooks702860 = ownerDigits.includes('702860');

    return {
      ok: actions.every((a) => a.ok !== false),
      created,
      assistant_id: assistantId,
      assistant_name: assistant?.name || 'LifeRE Screening Receptionist',
      transfer_enabled: Boolean(enableTransfer && ownerNumber),
      owner_number_masked: maskPhone(ownerNumber),
      owner_matches_702860_prefix: ownerLooks702860,
      inbound_vapi_number_masked: inboundMasked,
      webhook_url: webhookUrl,
      actions,
      founder_setup: {
        step_1: 'Your personal 702-860 line is NOT answered by AI until the carrier forwards it.',
        step_2: `On iPhone: Settings → Phone → Call Forwarding (or Conditional Forward / No Answer) → forward to the Vapi number ending ${inboundMasked || '***1079'}.`,
        step_3: 'Prefer Conditional / No Answer forward so you can still pick up family yourself; when you miss it, the AI screens.',
        step_4: 'Do NOT always-forward AND transfer back to the same cell — that loops. Conditional forward avoids the loop.',
        screening: 'Open: how can I help? Personal → light who-are-you. Transfer with warm brief to Adam first. Decline collectors/spam.',
        warm_transfer: 'Adam answers → hears short summary → caller joins. Best on Twilio-backed numbers; Vapi free lines may fall back to blind transfer.',
      },
      label: 'KNOW',
    };
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
    provisionScreeningReceptionist,
    handleVapiWebhook,
    normalizeVapiWebhookBody,
  };
}
