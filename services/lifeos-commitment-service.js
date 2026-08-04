/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * SYNOPSIS: Exports captureCommitment, getCommitments, resolveCommitment, proposeCalendarEvent —
 * turns natural-language commitments into timed database rows with timezone-aware dates.
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function normalizePeriod(p) {
  if (!p) return '';
  return p.toLowerCase().replace(/\./g, '').trim();
}

function titleFromText(text, removals) {
  let t = text;
  for (const r of removals) {
    if (r) t = t.replace(r, ' ');
  }
  return t
    .replace(/\b(at|on|for|next|this|tomorrow|today|tonight)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
    .trim();
}

export async function parseNaturalLanguage(text, { timezone: tz, db, userId }) {
  const input = String(text || '').trim();
  if (!input) return null;

  // query mode: user asks to list or show commitments.
  const queryMode = /\b(show|list|what are|query)\b.*\bcommitments?\b|\bcommitments?\b.*\b(show|list|query)\b/i;
  if (queryMode.test(input)) {
    if (!db || !userId) {
      return { replyType: 'query_mode', note: 'db and userId are required to fetch commitments' };
    }
    const commitments = await getCommitments(db, userId);
    const replyCard = commitments.map(c => ({ title: c.title, datetime: c.datetime })).filter(Boolean);
    return { replyType: 'query_mode', items: replyCard };
  }

  const tzStr = tz || 'America/New_York';
  const now = dayjs().tz(tzStr);

  // ── Date reference first (so numbers like "2" in "in 2 days" are not stolen as times)
  const weekdayGroup = DAY_NAMES.join('|');
  const monthGroup = MONTH_NAMES.join('|');
  const dateRe = new RegExp(
    '(\\btomorrow\\b|\\btoday\\b|\\btonight\\b|\\bnext\\s+(?:week\\s+)?(' + weekdayGroup + ')\\b|\\bthis\\s+(' + weekdayGroup + ')\\b|\\b(' + weekdayGroup + ')\\b|\\bin\\s+(\\d+)\\s+(day|hour|week|month|minute)(s?)\\b|\\b(' + monthGroup + ')\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b|\\b(\\d{1,2})[\\/-](\\d{1,2})(?:[\\/-](\\d{2,4}))?\\b)',
    'i',
  );
  const dateMatch = input.match(dateRe);
  const matchedDatePhrase = dateMatch ? dateMatch[0] : '';

  // Remove the date phrase before looking for time, so dates don't look like clock times.
  const dateEscaped = matchedDatePhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withoutDate = matchedDatePhrase
    ? input.replace(new RegExp(dateEscaped, 'i'), ' ')
    : input;

  // ── Time ────────────────────────────────────────────────────────────────────
  // Matches: 2, 2:30, 2:30pm, 2 pm, 14:00, 2pm
  const timeRe = /(?:\b(?:at|on|for)\s+)?(\d{1,2})(?::(\d{1,2}))?\s*(am|pm|a\.m\.|p\.m\.)?(?:\b|$)/i;
  const timeMatch = withoutDate.match(timeRe);
  let hour = null;
  let minute = 0;
  let period = '';
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = parseInt(timeMatch[2] || '0', 10);
    period = normalizePeriod(timeMatch[3]);
    if (period) {
      if (period.startsWith('p') && hour !== 12) hour += 12;
      if (period.startsWith('a') && hour === 12) hour = 0;
    } else if (hour > 0 && hour < 12) {
      // Bare hours like "at 5" or "at 2" are usually pm in everyday speech.
      hour += 12;
    }
  }

  let target = now;

  if (dateMatch) {
    const raw = dateMatch[0].toLowerCase();
    if (raw.includes('tomorrow')) {
      target = now.add(1, 'day');
    } else if (raw.includes('today') || raw.includes('tonight')) {
      target = now;
    } else if (dateMatch[5]) {
      // "in N days/hours/weeks/months/minutes"
      const amount = parseInt(dateMatch[5], 10);
      const unit = dateMatch[6].toLowerCase();
      target = now.add(amount, unit);
    } else {
      const dayName = dateMatch[4] || dateMatch[3] || dateMatch[2] || '';
      const monthName = dateMatch[8] || '';
      const monthDay = dateMatch[9] ? parseInt(dateMatch[9], 10) : null;
      const slashMonth = dateMatch[10] ? parseInt(dateMatch[10], 10) : null;
      const slashDay = dateMatch[11] ? parseInt(dateMatch[11], 10) : null;
      const slashYear = dateMatch[12] ? parseInt(dateMatch[12], 10) : null;

      if (dayName) {
        const idx = DAY_NAMES.indexOf(dayName.toLowerCase());
        target = now.day(idx);
        if (!target.isAfter(now, 'day')) {
          target = target.add(7, 'day');
        }
      } else if (monthName && monthDay) {
        const monthIdx = MONTH_NAMES.indexOf(monthName.toLowerCase());
        target = now.month(monthIdx).date(monthDay).year(now.year());
        if (!target.isAfter(now, 'day')) {
          target = target.add(1, 'year');
        }
      } else if (slashMonth && slashDay) {
        // Treat M/D as month/day in the user's locale.
        let year = slashYear ? slashYear : now.year();
        if (year < 100) year += 2000;
        target = dayjs.tz(`${year}-${String(slashMonth).padStart(2, '0')}-${String(slashDay).padStart(2, '0')}T00:00:00`, tzStr);
        if (!target.isValid() || !target.isAfter(now, 'day')) {
          target = target.add(1, 'year');
        }
      }
    }
  } else if (hour !== null) {
    // No date phrase but a time was found — assume today.
    target = now;
  }

  // If nothing was found at all, we cannot build a commitment.
  if (hour === null && !dateMatch) {
    return null;
  }

  // If we only found a date and no time, default to 09:00.
  if (hour === null) {
    hour = 9;
    minute = 0;
  }

  // Combine target date with time in the user's timezone, then store as UTC.
  const datetimeStr = `${target.format('YYYY-MM-DD')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  const when = dayjs.tz(datetimeStr, tzStr);

  // If the resulting timestamp has already passed and we did not explicitly ask
  // for a future offset, roll forward one day so "dentist at 2pm" at 4pm means tomorrow.
  let final = when;
  if (!dateMatch && !when.isAfter(now)) {
    final = when.add(1, 'day');
  }

  const title = titleFromText(input, [timeMatch ? timeMatch[0] : '', matchedDatePhrase]);

  return {
    title: title || 'commitment',
    datetime: final.toISOString(),
    durationMinutes: 60,
    timezone: tzStr,
    calendarEventRequested: true,
  };
}

export async function captureCommitment(db, text, { userId, timezone }) {
  const commitment = await parseNaturalLanguage(text, { timezone, db, userId });

  if (!commitment || commitment.replyType === 'query_mode') {
    throw new Error('Unable to parse commitment');
  }

  const { title, datetime, durationMinutes, calendarEventRequested } = commitment;
  // GAP-FILL, 2026-08-04: proven live via a real end-to-end test (Chair creates
  // a commitment through chat, then GET /api/v1/lifeos/commitments -- the
  // dashboard-facing API, backed by services/commitment-tracker.js -- returned
  // nothing). Root cause: the `commitments` table is shared by at least four
  // uncoordinated migrations/features (Word Keeper, Mission Runtime, this chat
  // path, commitment-tracker.js); a 2026-04-28 migration
  // (20260428_commitments_reminder_compat.sql) already bridges column NAMES
  // between the Word Keeper and LifeOS shapes with bidirectional backfill
  // UPDATEs (title/description/due_at/deadline), but never touches `status`
  // VALUES -- this insert never set status at all, defaulting to whatever the
  // table's column default happens to be ('pending' per
  // 20260705_create_commitments_table.sql), while commitment-tracker.js's
  // getOpen() hard-filters WHERE status = 'open'. Setting status and due_at
  // explicitly closes exactly that gap without touching the other table's
  // code or migrating any existing rows.
  const result = await db.query(
    'INSERT INTO commitments (user_id, title, datetime, duration_minutes, timezone, calendar_event_requested, status, due_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
    [userId, title, datetime, durationMinutes, timezone || 'America/New_York', calendarEventRequested, 'open', datetime],
  );

  return result.rows[0];
}

export async function getCommitments(db, userId, opts = {}) {
  // GAP-FILL 2026-08-04: unfiltered + ASC meant the oldest commitments ever
  // created (some from weeks earlier) always occupied the top of the list --
  // executeIntent's commitment_query case takes rows.slice(0, 5), so a brand
  // new, genuinely upcoming commitment was silently buried under stale past
  // rows every time. "Upcoming" means future-dated; filter and keep ASC so
  // the soonest real upcoming item is first.
  const result = await db.query(
    "SELECT * FROM commitments WHERE user_id = $1 AND status = 'open' AND datetime >= NOW() ORDER BY datetime ASC",
    [userId],
  );
  return result.rows;
}

export async function resolveCommitment(db, id, { approved, calendarEventId }) {
  const result = await db.query(
    'UPDATE commitments SET approved = $1, calendar_event_id = $2 WHERE id = $3 RETURNING *',
    [approved, calendarEventId, id],
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
    duration: commitment.durationMinutes,
  };

  return { vevent, payload };
}
