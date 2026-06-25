/**
 * SYNOPSIS: Routes ambient utterances to calendar, CRM inbox, BoldTrail notes, and coachable-moment logs.
 * Runs alongside commitment/note classification — no raw audio stored.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import {
  addContactNote,
  createOrUpdateContact,
  extractCreatedContactId,
  findContactByEmail,
  isBoldTrailAPIAvailable,
} from '../src/integrations/boldtrail.js';

const APPOINTMENT_MARKERS = [
  /\b(?:appointment|meeting|showing|open house|inspection|closing|call with|zoom with|meet with)\b/i,
  /\b(?:schedule|book|put on (?:my )?calendar|add to calendar)\b/i,
  /\b(?:tomorrow|next week|on (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
];

const CRM_MARKERS = [
  /\b(?:client|buyer|seller|lead|prospect|referral partner)\b/i,
  /\b(?:birthday|anniversary|prefers|preference|allergic|allergy|favorite|likes|dislikes)\b/i,
  /\b(?:phone number|email is|address is|works at|lives in)\b/i,
];

const COACHABLE_POSITIVE = [
  /\b(?:textbook|that was amazing|great job|well done|nailed it|perfect execution|look at the results)\b/i,
  /\b(?:what you did here|this is how you|that's the move|strong close|beautifully handled)\b/i,
];

const COACHABLE_IMPROVE = [
  /\b(?:next time|could have|should have|coach(?:able)? moment|work on|improve on)\b/i,
  /\b(?:don't forget to|remember to|watch your tone|slow down|listen more)\b/i,
];

function parseRelativeStart(text) {
  const t = String(text || '').toLowerCase();
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 0, 0);

  const atMatch = t.match(/\bat (\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  const hourFromAt = atMatch
    ? (() => {
        let h = parseInt(atMatch[1], 10);
        const m = atMatch[2] ? parseInt(atMatch[2], 10) : 0;
        const mer = (atMatch[3] || '').toLowerCase();
        if (mer === 'pm' && h < 12) h += 12;
        if (mer === 'am' && h === 12) h = 0;
        if (!mer && h >= 1 && h <= 7) h += 12;
        return { h, m };
      })()
    : null;

  function applyTime(d) {
    if (hourFromAt) {
      d.setHours(hourFromAt.h, hourFromAt.m, 0, 0);
    } else if (!/\b(?:morning|afternoon|evening|night)\b/.test(t)) {
      d.setHours(10, 0, 0, 0);
    } else if (/\bmorning\b/.test(t)) d.setHours(9, 0, 0, 0);
    else if (/\bafternoon\b/.test(t)) d.setHours(14, 0, 0, 0);
    else d.setHours(18, 0, 0, 0);
    return d;
  }

  if (/\btomorrow\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return applyTime(d).toISOString();
  }
  if (/\bnext week\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return applyTime(d).toISOString();
  }
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const hit = days.find((d) => t.includes(d));
  if (hit) {
    const target = days.indexOf(hit);
    const d = new Date(now);
    let delta = (target - d.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    d.setDate(d.getDate() + delta);
    return applyTime(d).toISOString();
  }
  if (/\btoday\b/.test(t)) return applyTime(new Date(now)).toISOString();
  if (/\bend of day\b/.test(t)) return endOfDay.toISOString();
  return null;
}

function extractAppointmentTitle(text) {
  const body = String(text || '').trim();
  const patterns = [
    /\b(?:appointment|meeting|showing|call|zoom)\s+(?:with\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:appointment|meeting|showing)\b/,
    /\b(dentist|doctor|therapy|inspection|closing|open house)\b/i,
  ];
  for (const re of patterns) {
    const m = body.match(re);
    if (m?.[1]) return m[1].trim().slice(0, 120);
  }
  if (/\bappointment\b/i.test(body)) return 'Appointment';
  if (/\bmeeting\b/i.test(body)) return 'Meeting';
  return body.slice(0, 80) || 'Calendar item';
}

function extractEmail(text) {
  const m = String(text || '').match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  return m?.[0]?.toLowerCase() || null;
}

function extractContactHint(text) {
  const m = String(text || '').match(/\b(?:client|with|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  return m?.[1]?.trim() || null;
}

async function tryBoldTrailCrmCapture(body, contactHint, metadata, logger) {
  if (!isBoldTrailAPIAvailable()) return null;

  const noteText = `[LifeOS Ambient] ${String(body || '').trim().slice(0, 500)}`;
  const email = metadata.boldtrail_email || metadata.crm_email || extractEmail(body);
  let contactId = metadata.boldtrail_contact_id || null;

  try {
    if (!contactId && email) {
      const found = await findContactByEmail(email);
      contactId = found?.id || null;
    }

    if (contactId) {
      const note = await addContactNote(contactId, noteText);
      if (note.ok) {
        return {
          type: 'boldtrail_note',
          contact_id: contactId,
          endpoint: note.endpoint || null,
        };
      }
    }

    if (email || contactHint) {
      const create = await createOrUpdateContact({
        name: contactHint || 'Ambient Contact',
        email: email || undefined,
        note: noteText,
        source: 'LifeOS-ambient',
        tags: ['LifeOS-ambient'],
      });
      const newId = create.contact_id || extractCreatedContactId(create.data);
      if (create.ok && newId) {
        return {
          type: 'boldtrail_contact_created',
          contact_id: newId,
          endpoint: create.endpoint || null,
        };
      }
    }
  } catch (err) {
    logger.warn?.('[ambient-moment] BoldTrail CRM skipped:', err.message);
  }
  return null;
}

export function detectMomentSignals(text) {
  const body = String(text || '').trim();
  return {
    appointment: APPOINTMENT_MARKERS.some((re) => re.test(body)),
    crm: CRM_MARKERS.some((re) => re.test(body)),
    coachablePositive: COACHABLE_POSITIVE.some((re) => re.test(body)),
    coachableImprove: COACHABLE_IMPROVE.some((re) => re.test(body)),
  };
}

export function createLuminAmbientMomentRouter({
  pool,
  calendar = null,
  actionInbox = null,
  logger = console,
}) {
  async function logCoachableMoment(userId, payload) {
    try {
      await pool.query(
        `INSERT INTO lifeos_ambient_snapshots (user_id, signals)
         VALUES ($1, $2::jsonb)`,
        [userId, JSON.stringify({ type: 'coachable_moment', ...payload })],
      );
      return true;
    } catch (err) {
      logger.warn?.('[ambient-moment] coachable log failed:', err.message);
      return false;
    }
  }

  async function tryCrmClientNote(userId, text, contactHint) {
    try {
      const { rows: tables } = await pool.query(
        `SELECT to_regclass('public.client_notes') AS reg`,
      );
      if (!tables[0]?.reg) return null;
      const note = String(text || '').trim().slice(0, 2000);
      const { rows } = await pool.query(
        `INSERT INTO client_notes (client_id, note, created_at)
         VALUES (
           COALESCE(
             (SELECT id FROM clients WHERE name ILIKE $2 LIMIT 1),
             (SELECT id FROM clients ORDER BY updated_at DESC NULLS LAST LIMIT 1)
           ),
           $1,
           NOW()
         )
         RETURNING id`,
        [note, contactHint || '%'],
      );
      return rows[0]?.id || null;
    } catch (err) {
      logger.warn?.('[ambient-moment] client_notes insert skipped:', err.message);
      return null;
    }
  }

  async function applyMoments({ userId, text, metadata = {} }) {
    const body = String(text || '').trim();
    if (!body) return [];

    const signals = detectMomentSignals(body);
    const moments = [];

    if (signals.appointment && calendar) {
      const startsAt = parseRelativeStart(body);
      if (startsAt) {
        const start = new Date(startsAt);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        try {
          const event = await calendar.createEvent(userId, {
            title: extractAppointmentTitle(body),
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
            metadata: {
              source: 'ambient_voice',
              auto_created: true,
              quote: body.slice(0, 400),
              ...metadata,
            },
          });
          moments.push({
            type: 'calendar_event',
            id: event?.id,
            title: event?.title,
            starts_at: event?.starts_at,
          });
        } catch (err) {
          logger.warn?.('[ambient-moment] calendar create failed:', err.message);
        }
      }
    }

    if (signals.crm) {
      const contactHint = extractContactHint(body);
      let inboxId = null;
      let clientNoteId = null;

      if (actionInbox) {
        try {
          const item = await actionInbox.captureItem({
            userId,
            source: 'ambient_voice',
            rawText: body,
            metadata: {
              ...metadata,
              crm_auto: true,
              contact_hint: contactHint,
              moment_type: 'crm_capture',
            },
            mode: 'conversation',
          });
          inboxId = item?.id || item?.item?.id || null;
        } catch (err) {
          logger.warn?.('[ambient-moment] CRM inbox failed:', err.message);
        }
      }

      clientNoteId = await tryCrmClientNote(userId, body, contactHint);

      const boldtrailMoment = await tryBoldTrailCrmCapture(body, contactHint, metadata, logger);

      if (inboxId || clientNoteId || boldtrailMoment) {
        moments.push({
          type: 'crm_capture',
          inbox_id: inboxId,
          client_note_id: clientNoteId,
          contact_hint: contactHint,
          boldtrail: boldtrailMoment,
        });
      }
    }

    if (signals.coachablePositive || signals.coachableImprove) {
      const polarity = signals.coachablePositive && !signals.coachableImprove
        ? 'strength'
        : signals.coachableImprove && !signals.coachablePositive
          ? 'improve'
          : 'mixed';
      const logged = await logCoachableMoment(userId, {
        polarity,
        text_preview: body.slice(0, 500),
        metadata,
      });
      if (logged) {
        moments.push({
          type: 'coachable_moment',
          polarity,
          text_preview: body.slice(0, 160),
        });
      }
    }

    return moments;
  }

  return {
    detectMomentSignals,
    applyMoments,
    parseRelativeStart,
  };
}
