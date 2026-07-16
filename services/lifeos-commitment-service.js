/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * SYNOPSIS: Exports captureCommitment — services/lifeos-commitment-service.js.
 */

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_RE = new RegExp(`(?:next\\s+)?(?:${DAYS.join('|')})`, 'i');
const DAY_REF_RE = /\b(tomorrow|today)\b/i;
const TIME_RE = /\d{1,2}(?::\d{2})?(?:\s?(?:am|pm))?/i;

function parseTime(timeStr) {
  const normalized = timeStr.replace(/\s+/g, '').toLowerCase();
  const period = normalized.slice(-2) === 'am' || normalized.slice(-2) === 'pm'
    ? normalized.slice(-2)
    : null;
  const numPart = period ? normalized.slice(0, -2) : normalized;
  const [hourStr, minuteStr = '0'] = numPart.split(':');
  let hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10) || 0;
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  return { hours, minutes };
}

function resolveDate(dayRef, now) {
  const target = new Date(now);
  if (!dayRef) return target;

  const lower = dayRef.toLowerCase().trim();
  if (lower === 'tomorrow') {
    target.setDate(now.getDate() + 1);
    return target;
  }
  if (lower === 'today') return target;

  const dayNameMatch = lower.match(/(?:next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (dayNameMatch) {
    const targetDay = DAYS.indexOf(dayNameMatch[1]);
    let daysUntil = (targetDay + 7 - now.getDay()) % 7 || 7;
    if (/next\s+/i.test(lower)) daysUntil += 7;
    target.setDate(now.getDate() + daysUntil);
    return target;
  }
  return target;
}

const parseNaturalLanguage = (text, { timezone }) => {
  let cleaned = String(text || '')
    .replace(/^(?:commitment|appointment|schedule|reminder|remind me to):?\s*/i, '')
    .trim();

  const timeMatch = cleaned.match(TIME_RE);
  if (!timeMatch) return null;

  const dayMatch = cleaned.match(DAY_RE) || cleaned.match(DAY_REF_RE);
  const dayRef = dayMatch ? dayMatch[0] : null;

  let title = cleaned;
  if (timeMatch) title = title.replace(timeMatch[0], '');
  if (dayMatch) title = title.replace(dayMatch[0], '');
  title = title
    .replace(/\b(?:at|on|for)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title) return null;

  const { hours, minutes } = parseTime(timeMatch[0]);
  const now = new Date();
  const targetDate = resolveDate(dayRef, now);
  targetDate.setHours(hours, minutes, 0, 0);

  return {
    title,
    datetime: targetDate.toISOString(),
    durationMinutes: 60,
    timezone,
    calendarEventRequested: true,
  };
};

export async function captureCommitment(db, text, { userId, timezone }) {
  const commitment = parseNaturalLanguage(text, { timezone });

  if (!commitment) {
    throw new Error('Unable to parse commitment');
  }

  const { title, datetime, durationMinutes, calendarEventRequested } = commitment;
  const result = await db.query(
    'INSERT INTO commitments (user_id, title, datetime, duration_minutes, timezone, calendar_event_requested) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [userId, title, datetime, durationMinutes, timezone, calendarEventRequested]
  );

  return result.rows[0];
}

export async function getCommitments(db, userId, opts = {}) {
  const result = await db.query('SELECT * FROM commitments WHERE user_id = $1', [userId]);
  return result.rows;
}

export async function resolveCommitment(db, id, { approved, calendarEventId }) {
  const result = await db.query(
    'UPDATE commitments SET approved = $1, calendar_event_id = $2 WHERE id = $3 RETURNING *',
    [approved, calendarEventId, id]
  );

  return result.rows[0];
}

export function proposeCalendarEvent(commitment) {
  const vevent = `
BEGIN:VEVENT
SUMMARY:${commitment.title}
DTSTART:${commitment.datetime.replace(/[-:]/g, '').split('.')[0]}
DURATION:PT${commitment.durationMinutes}M
END:VEVENT
  `.trim();

  const payload = {
    summary: commitment.title,
    start: commitment.datetime,
    duration: commitment.durationMinutes
  };

  return { vevent, payload };
}
