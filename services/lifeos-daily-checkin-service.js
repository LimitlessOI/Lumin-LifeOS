/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * SYNOPSIS: Exports getPromptForUser — services/lifeos-daily-checkin-service.js.
 */

export async function getPromptForUser(db, userId) {
  const userResult = await db.query('SELECT display_name FROM lifeos_users WHERE id = $1', [userId]);
  const userName = userResult.rows[0]?.display_name || 'User';
  return `${userName}, what have you worked on for the last 15 minutes?`;
}

export async function startCheckin(db, userId) {
  return getPromptForUser(db, userId);
}

export async function addCheckinEntry(db, userId, text, { minutesAgo }) {
  const checkinTime = new Date();
  if (minutesAgo) {
    checkinTime.setMinutes(checkinTime.getMinutes() - minutesAgo);
  }
  const result = await db.query(
    'INSERT INTO checkins (user_id, activity_text, created_at) VALUES ($1, $2, $3) RETURNING *',
    [userId, text, checkinTime]
  );
  return result.rows[0];
}

export function buildReplyFromEntries(entries) {
  if (entries.length === 0) {
    return 'No activities recorded today.';
  }

  const bulletPoints = entries
    .map(entry => {
      const time = new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `* ${time}: ${entry.activity_text}`;
    })
    .join('\n');

  return `Today's Activities:\n${bulletPoints}`;
}

export async function getTodaySummary(db, userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1); // Start of tomorrow

  const result = await db.query(
    'SELECT activity_text, created_at FROM checkins WHERE user_id = $1 AND created_at >= $2 AND created_at < $3 ORDER BY created_at ASC',
    [userId, today, tomorrow]
  );

  const entries = result.rows;
  const summary = buildReplyFromEntries(entries);

  return { entries, summary };
}