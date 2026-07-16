/**
 * SYNOPSIS: Exports captureCommitment — services/lifeos-commitment-service.js.
 */
const parseNaturalLanguage = (text, { timezone }) => {
  // Simple regex-based natural language parser example
  const regex = /(?<title>[\w\s]+) at (?<time>\d{1,2}(?::\d{2})?\s?(?:am|pm)?) next (?<day>\w+)/i;
  const match = text.match(regex);

  if (!match) return null;

  const { title, time, day } = match.groups;
  const daysMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };

  // Calculate datetime assuming next week
  const now = new Date();
  const targetDay = daysMap[day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()];
  const daysUntilTarget = (targetDay + 7 - now.getDay()) % 7 || 7;
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntilTarget);

  const [hour, minutePart] = time.toLowerCase().split(':');
  let [minutes, period] = minutePart ? minutePart.match(/(\d{2})(\s?(am|pm))/).slice(1) : [0, time.slice(-2)];

  let hours = parseInt(hour, 10);
  minutes = parseInt(minutes, 10);

  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  targetDate.setHours(hours, minutes);

  return {
    title,
    datetime: targetDate.toISOString(),
    durationMinutes: 60, // Default duration
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