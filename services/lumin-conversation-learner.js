/**
 * SYNOPSIS: Learns preferences, contacts, CRM notes, and success moments from conversations → twin.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { createAdamLogger, EVENTS } from './adam-logger.js';
import { createCommunicationProfile } from './communication-profile.js';
import { createLifeRETwinStore } from './lifere-twin-store.js';

function extractJsonBlock(text, fallback) {
  const raw = String(text || '').trim();
  if (!raw) return fallback;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch { return fallback; }
  }
  const idx = Math.max(raw.indexOf('{'), raw.indexOf('['));
  if (idx >= 0) {
    try { return JSON.parse(raw.slice(idx)); } catch { return fallback; }
  }
  return fallback;
}

const ANNOYANCE_MARKERS = /\b(stop asking|annoying|too many questions|just do it|don't ask|shut up|enough with|quit asking|hate when you|frustrated with you)\b/i;

export function createLuminConversationLearner({ pool, callAI = null, logger = console }) {
  const adamLogger = createAdamLogger(pool);
  const twinStore = createLifeRETwinStore({ pool, logger });
  const commProfile = pool ? createCommunicationProfile({ pool, callAI, logger }) : null;

  async function extractSignalsFromBatch(messages) {
    if (!callAI || !messages?.length) {
      return { preferences: [], contacts: [], crm_notes: [], moments: [] };
    }
    const transcript = messages
      .map((m) => `[${m.role}] ${String(m.content || '').trim().slice(0, 900)}`)
      .join('\n\n')
      .slice(0, 14000);

    const prompt = `Extract learning signals from Adam's conversations for his digital twin.

Return JSON only:
{
  "preferences": [
    {"type":"tone|avoid|want_automation|helpful","text":"plain English","confidence":0.0-1.0,"source_message_id":123}
  ],
  "contacts": [
    {"name":"Frank Driscoll","field":"birthday|phone|email|note","value":"...","context":"where heard","confidence":0.0-1.0,"source_message_id":123}
  ],
  "crm_notes": [
    {"client_or_deal":"name","note":"fact to remember","action_suggested":"follow up|update CRM|schedule","confidence":0.0-1.0}
  ],
  "moments": [
    {"type":"success|lesson|insight|commitment","title":"short","body":"what to remember","tags":["..."],"confidence":0.0-1.0,"source_message_id":123}
  ]
}

Rules:
- Only extract what Adam or his contacts explicitly said — no invention
- preferences: how Adam wants Lumin to talk, what annoys him, busywork he wants automated
- contacts: real people mentioned with concrete details (birthday, phone, etc.)
- crm_notes: real estate client/deal facts
- moments: wins, breakthroughs, or lessons worth replaying later
- confidence >= 0.7 to include
- max 5 per category

Transcript:
${transcript}`;

    try {
      const raw = await callAI(prompt);
      const parsed = extractJsonBlock(raw, {});
      const filter = (arr) => (Array.isArray(arr) ? arr : [])
        .filter((item) => Number(item?.confidence ?? 0.7) >= 0.7)
        .slice(0, 8);
      return {
        preferences: filter(parsed.preferences),
        contacts: filter(parsed.contacts),
        crm_notes: filter(parsed.crm_notes),
        moments: filter(parsed.moments),
      };
    } catch (err) {
      logger.warn?.('[LUMIN-LEARNER] extract failed:', err.message);
      return { preferences: [], contacts: [], crm_notes: [], moments: [] };
    }
  }

  async function applyPreferenceSignals(userId, userHandle, signals) {
    let applied = 0;
    for (const sig of signals || []) {
      const text = String(sig.text || '').trim();
      if (!text) continue;
      await pool.query(
        `INSERT INTO lumin_preference_log (user_id, signal_type, signal_text, source_ref)
         VALUES ($1, $2, $3, $4)`,
        [userId, String(sig.type || 'preference').slice(0, 32), text, String(sig.source_message_id || '')],
      ).catch(() => {});

      if (commProfile) {
        const profile = await commProfile.getOrCreate(userId);
        const avoid = [...(profile.phrases_to_avoid || [])];
        const land = [...(profile.phrases_that_land || [])];
        if (sig.type === 'avoid' && !avoid.includes(text)) {
          avoid.push(text.slice(0, 200));
          await pool.query(
            `UPDATE communication_profiles SET phrases_to_avoid = $1::text[], updated_at = NOW() WHERE user_id = $2`,
            [avoid.slice(-30), userId],
          );
        } else if ((sig.type === 'helpful' || sig.type === 'tone') && !land.includes(text)) {
          land.push(text.slice(0, 200));
          await pool.query(
            `UPDATE communication_profiles SET phrases_that_land = $1::text[], updated_at = NOW() WHERE user_id = $2`,
            [land.slice(-30), userId],
          );
        }
      }

      if (sig.type === 'want_automation') {
        const personal = twinStore.readTwin({ tenantId: 'default', userId: userHandle, twinKey: 'personal' }) || {};
        const busy = [...new Set([...(personal.unwanted_busywork || []), text.slice(0, 120)])].slice(-20);
        await twinStore.writeTwin({
          tenantId: 'default',
          userId: userHandle,
          twinKey: 'personal',
          payload: { ...personal, unwanted_busywork: busy },
          receiptMeta: { source: 'lumin_conversation_learner' },
        });
      }
      applied += 1;
    }
    return applied;
  }

  async function queueContactUpdates(userId, contacts) {
    let queued = 0;
    for (const c of contacts || []) {
      const name = String(c.name || '').trim();
      const field = String(c.field || 'note').trim();
      const value = String(c.value || '').trim();
      if (!name || !value) continue;
      const sourceRef = `conversation_message:${c.source_message_id || 'batch'}`;
      const { rows: existing } = await pool.query(
        `SELECT id FROM lumin_contact_update_queue
          WHERE user_id = $1 AND contact_name = $2 AND field_name = $3 AND field_value = $4 AND status = 'pending'
          LIMIT 1`,
        [userId, name, field, value],
      ).catch(() => ({ rows: [] }));
      if (existing[0]) continue;
      await pool.query(
        `INSERT INTO lumin_contact_update_queue
           (user_id, contact_name, field_name, field_value, context_note, source_ref)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, name, field, value, String(c.context || '').slice(0, 500), sourceRef],
      );
      queued += 1;
    }
    return queued;
  }

  async function recordMoments(userId, moments) {
    let recorded = 0;
    for (const m of moments || []) {
      const title = String(m.title || '').trim();
      const body = String(m.body || m.title || '').trim();
      if (!title) continue;
      const sourceRef = `conversation_message:${m.source_message_id || 'batch'}`;
      const { rows: existing } = await pool.query(
        `SELECT id FROM lumin_moment_clips WHERE user_id = $1 AND source_ref = $2 LIMIT 1`,
        [userId, sourceRef],
      ).catch(() => ({ rows: [] }));
      if (existing[0]) continue;
      await pool.query(
        `INSERT INTO lumin_moment_clips
           (user_id, clip_type, title, body, source, source_ref, tags)
         VALUES ($1, $2, $3, $4, 'conversation', $5, $6::text[])`,
        [
          userId,
          String(m.type || 'lesson').slice(0, 32),
          title,
          body,
          sourceRef,
          Array.isArray(m.tags) ? m.tags.map(String) : ['learned'],
        ],
      );
      recorded += 1;
    }
    return recorded;
  }

  async function learnFromMessages({ userId, userHandle = 'adam', messages }) {
    const signals = await extractSignalsFromBatch(messages);
    const preferences = await applyPreferenceSignals(userId, userHandle, signals.preferences);
    const contacts = await queueContactUpdates(userId, signals.contacts);
    const moments = await recordMoments(userId, signals.moments);

    for (const note of signals.crm_notes || []) {
      await adamLogger.log(EVENTS.PREFERENCE, {
        subject: note.client_or_deal || 'crm_note',
        inputText: note.note,
        decision: note.action_suggested || 'remember',
        context: { source: 'conversation_learner', crm: true },
        tags: ['crm', 'learned'],
      });
    }

    return {
      preferences_applied: preferences,
      contacts_queued: contacts,
      moments_recorded: moments,
      crm_notes: signals.crm_notes?.length || 0,
    };
  }

  async function saveMoment({ userId, clipType = 'lesson', title, body, source = 'manual', sourceRef = null, tags = [] }) {
    const { rows } = await pool.query(
      `INSERT INTO lumin_moment_clips (user_id, clip_type, title, body, source, source_ref, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7::text[])
       RETURNING *`,
      [userId, clipType, title, body, source, sourceRef, tags],
    );
    await adamLogger.log(EVENTS.OUTCOME_LOGGED, {
      subject: title,
      inputText: body?.slice(0, 500),
      tags: ['moment', clipType, ...(tags || [])],
    });
    return rows[0];
  }

  async function recordTurnFeedback({ userId, userMessage, luminReply, responseLength = null }) {
    if (!commProfile || !userId) return null;
    const msg = String(userMessage || '').trim();
    const annoyed = ANNOYANCE_MARKERS.test(msg);
    const veryShort = msg.length > 0 && msg.length < 25;
    let signal = 'continued';
    if (annoyed) signal = 'session_ended_early';
    else if (veryShort && String(luminReply || '').length > 400) signal = 'ignored';
    await commProfile.recordEngagement({
      userId,
      context: 'lumin_founder_chat',
      engagement_signal: signal,
      response_length: responseLength ?? msg.split(/\s+/).length,
    }).catch(() => {});
    if (annoyed) {
      await applyPreferenceSignals(userId, 'adam', [{
        type: 'avoid',
        text: msg.slice(0, 200),
        confidence: 0.95,
      }]);
    }
    return { signal, annoyed };
  }

  return {
    learnFromMessages,
    saveMoment,
    recordTurnFeedback,
    extractSignalsFromBatch,
  };
}
