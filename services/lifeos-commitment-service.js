/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * SYNOPSIS: Exports captureCommitment — services/lifeos-commitment-service.js.
 */
const parseNaturalLanguage = (text, { timezone }) => {
  // Match patterns like: "dentist appointment at 2pm next Tuesday" or "call john at 9am tomorrow"
  const regex = /(?<title>[\w\s]+?)\s+(?:at|on|for)\s+(?<time>\d{1,2}(?::\d{2})?\s?(?:am|pm)?)\s+(?<dayRef>tomorrow|next\s+(?<day>\w+)|today)/i;
  const match = text.match(regex);

  if (!match) return null;

  const { title, time, dayRef, day } = match.groups;
  const daysMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };

  const now = new Date();
  let targetDate = new Date(now);

  const normalizedDayRef = dayRef.toLowerCase().trim();
  if (normalizedDayRef === 'tomorrow') {
    targetDate.setDate(now.getDate() + 1);
  } else if (normalizedDayRef === 'today') {
    // same day
  } else if (day) {
    const targetDay = daysMap[day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()];
    if (targetDay) {
      const daysUntilTarget = (targetDay + 7 - now.getDay()) % 7 || 7;
      targetDate.setDate(now.getDate() + daysUntilTarget);
    }
  }

  const [hour, minutePart] = time.toLowerCase().split(':');
  let minutes = 0;
  let period = null;
  if (minutePart) {
    const minuteMatch = minutePart.match(/(\d{1,2})(\s?(am|pm))?/);
    if (minuteMatch) {
      minutes = parseInt(minuteMatch[1], 10);
      period = minuteMatch[3] || null;
    }
  } else {
    period = time.slice(-2).toLowerCase();
    if (period !== 'am' && period !== 'pm') period = null;
  }

  let hours = parseInt(hour, 10);
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  targetDate.setHours(hours, minutes, 0, 0);

  return {
    title: title.trim(),
    datetime: targetDate.toISOString(),
    durationMinutes: 60,
    timezone,
    calendarEventRequested: true
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