/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * SYNOPSIS: Daily activity check-in service — records "what have you worked on for the last 15 minutes?" and builds today's summary.
 */

export function getPromptForUser(_db, _userId) {
  return 'Adam, what have you worked on for the last 15 minutes?';
}

export async function startCheckin(db, userId) {
  return getPromptForUser(db, userId);
}

export async function addCheckinEntry(db, userId, text, { minutesAgo = 15, source = 'chat' } = {}) {
  const result = await db.query(
    `INSERT INTO checkins (user_id, activity_text, minutes_ago, source, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, user_id, activity_text AS entry_text, minutes_ago, source, created_at`,
    [userId, text, minutesAgo, source]
  );
  return result.rows[0];
}

export async function getTodaySummary(db, userId) {
  const result = await db.query(
    `SELECT id, activity_text AS entry_text, minutes_ago, source, created_at
     FROM checkins
     WHERE user_id = $1 AND created_at >= CURRENT_DATE
     ORDER BY created_at DESC`,
    [userId]
  );
  const entries = result.rows;
  const bullets = buildReplyFromEntries(entries);
  const summary = bullets.length
    ? `Today's check-ins:\n${bullets}`
    : 'No check-ins recorded today yet.';
  return { entries, summary };
}

export function buildReplyFromEntries(entries) {
  return entries
    .map((e, i) => `${i + 1}. ${e.entry_text || e.activity_text} (${e.minutes_ago || 15} min ago)`)
    .join('\n');
}
