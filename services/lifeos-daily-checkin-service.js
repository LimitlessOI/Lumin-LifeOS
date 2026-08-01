/**
 * SYNOPSIS: Daily activity check-in service for recording and summarizing work.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
export async function startCheckin(deps, userId) {
  const { logger } = deps;
  try {
    const prompt = await getPromptForUser(deps, userId);
    return prompt;
  } catch (error) {
    logger.error({ error, userId }, 'Error in startCheckin');
    throw new Error('Failed to start checkin');
  }
}

export async function addCheckinEntry(deps, userId, text, { minutesAgo } = {}) {
  const db = deps.pool;
  const logger = deps.logger;
  try {
    // Assuming a 'checkins' table exists with columns: user_id, entry_text, occurred_at
    const occurredAt = minutesAgo ? new Date(Date.now() - minutesAgo * 60 * 1000) : new Date();
    const { rows } = await db.query(
      'INSERT INTO checkins (user_id, entry_text, occurred_at) VALUES ($1, $2, $3) RETURNING *',
      [userId, text, occurredAt]
    );
    return rows[0];
  } catch (error) {
    logger.error({ error, userId, text }, 'Error in addCheckinEntry');
    throw new Error('Failed to add checkin entry');
  }
}

export async function getTodaySummary(deps, userId) {
  const db = deps.pool;
  const logger = deps.logger;
  const callCouncilMember = deps.callCouncilMember;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { rows: entries } = await db.query(
      'SELECT entry_text FROM checkins WHERE user_id = $1 AND occurred_at >= $2 ORDER BY occurred_at ASC',
      [userId, today]
    );

    const entryTexts = entries.map(entry => entry.entry_text);
    const summary = await callCouncilMember(
      'summarizer',
      `Summarize the following daily activity entries concisely:\n\n${entryTexts.join('\n')}`
    );

    return { entries: entryTexts, summary };
  } catch (error) {
    logger.error({ error, userId }, 'Error in getTodaySummary');
    throw new Error('Failed to get today\'s summary');
  }
}

export async function getPromptForUser(deps, userId) {
  const db = deps.pool;
  const logger = deps.logger;
  try {
    // Assuming a 'users' table exists with a 'name' column
    const { rows } = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
    const userName = rows.length > 0 ? rows[0].name : 'User';

    // Fetch recent entries for context if needed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { rows: recentEntries } = await db.query(
      'SELECT entry_text FROM checkins WHERE user_id = $1 AND occurred_at >= $2 ORDER BY occurred_at DESC LIMIT 3',
      [userId, today]
    );

    let context = '';
    if (recentEntries.length > 0) {
      context = '\n\nRecent activities:\n' + recentEntries.map(e => `- ${e.entry_text}`).join('\n');
    }

    return `${userName}, what have you worked on for the last 15 minutes?${context}`;
  } catch (error) {
    logger.error({ error, userId }, 'Error in getPromptForUser');
    throw new Error('Failed to get prompt for user');
  }
}

export async function buildReplyFromEntries(entries) {
  // This function assumes 'entries' is an array of strings
  if (!Array.isArray(entries) || entries.length === 0) {
    return 'No activities recorded today.';
  }
  return entries.map(entry => `- ${entry}`).join('\n');
}