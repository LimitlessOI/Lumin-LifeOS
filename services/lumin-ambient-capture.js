/**
 * SYNOPSIS: Classifies ambient voice utterances — ignore, note, commitment, renegotiate;
 * routes calendar, CRM, and coachable moments via lumin-ambient-moment-router.
 * Opt-in only; no raw audio stored.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { detectMomentSignals } from './lumin-ambient-moment-router.js';

const NOISE_ONLY = /^(yeah|yes|no|ok|okay|uh|um|hmm|thanks|thank you|hi|hello|hey|cool|nice|right|sure|mm-hmm|mhm)\.?$/i;

const COMMITMENT_MARKERS = [
  /\bI(?:'ll| will)\b/i,
  /\bI (?:need to|have to|must|promise|commit|owe)\b/i,
  /\b(?:going to|gonna) (?:call|send|email|text|finish|deliver|pay|meet|get|make|do)\b/i,
  /\bby (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|end of (?:day|week|month))\b/i,
];

const RENEGOTIATE_MARKERS = [
  /\b(?:can't|cannot|won't|need to push|need to move|have to reschedule|running late|won't make it)\b/i,
  /\b(?:renegotiate|push (?:it|that|this) (?:to|back)|move (?:it|that) to|delay (?:that|this|it))\b/i,
];

const NOTEWORTHY_MARKERS = [
  /\b(?:remember|note that|important|decided|deadline|meeting|client|listing|offer|contract|follow up|action item)\b/i,
  /\b(?:birthday|anniversary|phone number|email is|address is)\b/i,
  /\$\d+/,
];

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

function parseRelativeDue(text) {
  const t = String(text || '').toLowerCase();
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 0, 0);

  if (/\btomorrow\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d.toISOString();
  }
  if (/\bnext week\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(17, 0, 0, 0);
    return d.toISOString();
  }
  if (/\b(?:friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/.test(t)) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const hit = days.find((d) => t.includes(d));
    if (hit) {
      const target = days.indexOf(hit);
      const d = new Date(now);
      let delta = (target - d.getDay() + 7) % 7;
      if (delta === 0) delta = 7;
      d.setDate(d.getDate() + delta);
      d.setHours(17, 0, 0, 0);
      return d.toISOString();
    }
  }
  if (/\bend of day\b/.test(t)) return endOfDay.toISOString();
  return null;
}

function quickGate(text) {
  const body = String(text || '').trim();
  if (!body) return { skip: true, reason: 'empty' };
  if (body.length < 12) return { skip: true, reason: 'too_short' };
  if (NOISE_ONLY.test(body)) return { skip: true, reason: 'noise' };

  const hasCommitment = COMMITMENT_MARKERS.some((re) => re.test(body));
  const hasRenegotiate = RENEGOTIATE_MARKERS.some((re) => re.test(body));
  const hasNote = NOTEWORTHY_MARKERS.some((re) => re.test(body));
  const moments = detectMomentSignals(body);
  const hasMoment = moments.appointment || moments.crm || moments.coachablePositive || moments.coachableImprove;

  if (!hasCommitment && !hasRenegotiate && !hasNote && !hasMoment && body.length < 40) {
    return { skip: true, reason: 'casual_chatter' };
  }

  return {
    skip: false,
    signals: { hasCommitment, hasRenegotiate, hasNote, hasMoment, moments, length: body.length },
  };
}

export function createLuminAmbientCapture({
  pool,
  callAI = null,
  commitments,
  eventStream = null,
  actionInbox = null,
  luminLearner = null,
  momentRouter = null,
  logger = console,
}) {
  async function logSnapshot(userId, payload) {
    try {
      await pool.query(
        `INSERT INTO lifeos_ambient_snapshots (user_id, signals)
         VALUES ($1, $2::jsonb)`,
        [userId, JSON.stringify(payload)],
      );
    } catch (err) {
      logger.warn?.('[ambient] snapshot log failed:', err.message);
    }
  }

  async function classifyWithAI(text, signals) {
    if (!callAI) {
      if (signals.hasRenegotiate) return { disposition: 'renegotiate', confidence: 0.7, note: null };
      if (signals.hasCommitment) return { disposition: 'commitment', confidence: 0.75, note: null };
      if (signals.hasNote) return { disposition: 'note', confidence: 0.65, note: text.slice(0, 200) };
      return { disposition: 'ignore', confidence: 0.6, note: null };
    }

    const prompt = `You gate ambient speech for LifeOS. Decide if this utterance should be saved.

Utterance:
"${text.replace(/"/g, '\\"')}"

Return JSON only:
{
  "disposition": "ignore|note|commitment|renegotiate",
  "confidence": 0.0-1.0,
  "note_title": "short title if note",
  "reason": "one line why"
}

Rules:
- ignore: TV background, filler, casual chat with no actionable info, greetings, acknowledgments
- note: facts, decisions, people details, insights worth remembering (not a promise)
- commitment: explicit promise or obligation ("I will…", "I need to… by Friday")
- renegotiate: backing out, rescheduling, or changing an existing promise
- When unsure and no clear promise → ignore (fail closed on noise)
- confidence >= 0.72 to persist`;

    try {
      const raw = await callAI(prompt);
      const parsed = extractJsonBlock(raw, {});
      const disposition = ['ignore', 'note', 'commitment', 'renegotiate'].includes(parsed.disposition)
        ? parsed.disposition
        : 'ignore';
      return {
        disposition,
        confidence: Number(parsed.confidence ?? 0.5),
        note: parsed.note_title || null,
        reason: parsed.reason || null,
      };
    } catch (err) {
      logger.warn?.('[ambient] AI classify failed:', err.message);
      if (signals.hasRenegotiate) return { disposition: 'renegotiate', confidence: 0.65, note: null };
      if (signals.hasCommitment) return { disposition: 'commitment', confidence: 0.7, note: null };
      if (signals.hasNote) return { disposition: 'note', confidence: 0.6, note: text.slice(0, 120) };
      return { disposition: 'ignore', confidence: 0.5, note: null };
    }
  }

  async function processUtterance({
    userId,
    text,
    channel = 'ambient_voice',
    autoApplyCommitments = true,
    metadata = {},
  }) {
    const body = String(text || '').trim();
    const gate = quickGate(body);
    if (gate.skip) {
      const moments = momentRouter
        ? await momentRouter.applyMoments({ userId, text: body, metadata })
        : [];
      if (moments.length) {
        return {
          ok: true,
          disposition: 'moment',
          reason: gate.reason,
          persisted: true,
          moments,
          feedback: summarizeMoments(moments),
        };
      }
      return {
        ok: true,
        disposition: 'ignore',
        reason: gate.reason,
        persisted: false,
      };
    }

    const classification = await classifyWithAI(body, gate.signals);
    const confidence = classification.confidence ?? 0;
    const minConfidence = classification.disposition === 'commitment' ? 0.68 : 0.72;

    if (classification.disposition === 'ignore' || confidence < minConfidence) {
      const moments = momentRouter
        ? await momentRouter.applyMoments({ userId, text: body, metadata })
        : [];
      await logSnapshot(userId, {
        type: moments.length ? 'utterance_moment_only' : 'utterance_ignored',
        text_preview: body.slice(0, 120),
        reason: classification.reason || 'low_confidence',
        confidence,
        moments,
      });
      if (moments.length) {
        return {
          ok: true,
          disposition: 'moment',
          reason: classification.reason || 'classified_ignore',
          confidence,
          persisted: true,
          moments,
          feedback: summarizeMoments(moments),
        };
      }
      return {
        ok: true,
        disposition: 'ignore',
        reason: classification.reason || 'classified_ignore',
        confidence,
        persisted: false,
      };
    }

    const result = {
      ok: true,
      disposition: classification.disposition,
      confidence,
      persisted: true,
      commitments: [],
      renegotiated: null,
      note: null,
      event: null,
    };

    if (classification.disposition === 'commitment' && commitments) {
      const extracted = await commitments.extractCommitments(body, userId);
      const toLog = (extracted || []).filter((c) => (c.confidence ?? 0.7) >= 0.65);
      if (toLog.length) {
        result.commitments = await commitments.logExtractedBatch({
          userId,
          messageText: body,
          items: toLog,
        });
      } else if (autoApplyCommitments) {
        result.commitments = await commitments.ingestFromMessage({
          userId,
          messageText: body,
          sourceRef: JSON.stringify({ source: 'ambient_voice', channel, captured_at: new Date().toISOString() }),
        });
      }
      if (!result.commitments?.length && eventStream) {
        const capture = await eventStream.captureEvent({
          userId,
          text: body,
          source: 'ambient_voice',
          channel,
          metadata: { ...metadata, ambient: true },
          autoApply: autoApplyCommitments,
        });
        result.event = capture.event;
        result.actions = capture.actions;
      }
      result.feedback = result.commitments?.length
        ? `Logged ${result.commitments.length} commitment(s). I'll help you keep or renegotiate.`
        : 'Heard a commitment — check Word Keeper if nothing was auto-logged.';
    } else if (classification.disposition === 'renegotiate' && commitments) {
      const match = await commitments.findMatchingOpen(userId, body);
      const newDue = parseRelativeDue(body);
      if (match) {
        result.renegotiated = await commitments.renegotiateCommitment({
          commitmentId: match.id,
          userId,
          newDueAt: newDue,
          reason: body.slice(0, 500),
          sourceRef: JSON.stringify({ source: 'ambient_voice', quote: body.slice(0, 300) }),
        });
        result.feedback = result.renegotiated
          ? `Renegotiated: "${match.title}". Updated terms — still on your Word Keeper list.`
          : `Heard renegotiation but could not update commitment #${match.id}.`;
      } else {
        result.disposition = 'note';
        result.feedback = 'Heard a reschedule — no matching open commitment found. Saved as a note.';
      }
    }

    if (result.disposition === 'note' || (classification.disposition === 'renegotiate' && !result.renegotiated)) {
      if (actionInbox) {
        result.note = await actionInbox.captureItem({
          userId,
          source: 'ambient_voice',
          rawText: body,
          metadata: { ...metadata, ambient: true, note_title: classification.note },
          mode: 'conversation',
        });
      } else if (eventStream) {
        const capture = await eventStream.captureEvent({
          userId,
          text: body,
          source: 'ambient_voice',
          channel,
          metadata: { ...metadata, ambient: true, note: true },
          autoApply: false,
        });
        result.event = capture.event;
      }
      result.feedback = result.feedback || 'Noted for your twin and action inbox.';
    }

    if (luminLearner && result.persisted) {
      luminLearner.learnFromMessages({
        userId,
        userHandle: 'adam',
        messages: [{ role: 'user', content: body }],
      }).catch((err) => {
        logger.warn?.('[ambient] twin learn failed:', err.message);
      });
    }

    if (momentRouter) {
      result.moments = await momentRouter.applyMoments({ userId, text: body, metadata });
      if (result.moments?.length) {
        const momentLine = summarizeMoments(result.moments);
        result.feedback = result.feedback ? `${result.feedback} ${momentLine}` : momentLine;
      }
    }

    await logSnapshot(userId, {
      type: 'utterance_processed',
      disposition: result.disposition,
      confidence,
      text_preview: body.slice(0, 160),
      commitment_ids: (result.commitments || []).map((c) => c.id),
      renegotiated_id: result.renegotiated?.id || null,
      moments: result.moments || [],
    });

    return result;
  }

  async function logCrisisSignal({
    userId,
    kind,
    partnerConsent = null,
    metadata = {},
  }) {
    const payload = {
      type: 'crisis_signal',
      kind: String(kind || 'unknown'),
      partner_consent: partnerConsent,
      metadata,
      at: new Date().toISOString(),
    };
    await logSnapshot(userId, payload);
    return { ok: true, logged: true, kind: payload.kind };
  }

  return {
    quickGate,
    processUtterance,
    logCrisisSignal,
  };
}

function summarizeMoments(moments = []) {
  const parts = [];
  for (const m of moments) {
    if (m.type === 'calendar_event') parts.push(`Calendar: ${m.title || 'event'}`);
    if (m.type === 'crm_capture') {
      if (m.boldtrail?.type === 'boldtrail_note') parts.push('BoldTrail note added');
      else if (m.boldtrail?.type === 'boldtrail_contact_created') parts.push('BoldTrail contact created');
      else parts.push('CRM note captured');
    }
    if (m.type === 'coachable_moment') {
      parts.push(m.polarity === 'strength' ? 'Coachable win saved' : 'Coachable moment saved');
    }
  }
  return parts.length ? parts.join(' · ') : '';
}
