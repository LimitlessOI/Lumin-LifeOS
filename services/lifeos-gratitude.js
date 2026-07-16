/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Exports logGratitude — services/lifeos-gratitude.js.
 */
export async function logGratitude(db, userId, date, entries, joyScore) {
  if (!db || typeof db.query !== "function") {
    throw new TypeError("logGratitude requires a database client with query()");
  }
  if (!userId) {
    throw new TypeError("logGratitude requires userId");
  }
  if (!date) {
    throw new TypeError("logGratitude requires date");
  }

  const normalizedEntries = Array.isArray(entries)
    ? entries.slice(0, 3).map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : [];

  while (normalizedEntries.length < 3) {
    normalizedEntries.push("");
  }

  const [entry1, entry2, entry3] = normalizedEntries;

  const existing = await db.query(
    `SELECT id
       FROM gratitude_logs
      WHERE user_id = $1
        AND date = $2
      LIMIT 1`,
    [userId, date]
  );

  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    const result = await db.query(
      `UPDATE gratitude_logs
          SET entry_1 = $1,
              entry_2 = $2,
              entry_3 = $3,
              updated_at = NOW()
        WHERE id = $4
        RETURNING *`,
      [entry1, entry2, entry3, id]
    );
    return result.rows[0];
  }

  const inserted = await db.query(
    `INSERT INTO gratitude_logs (user_id, date, entry_1, entry_2, entry_3, joy_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, date, entry1, entry2, entry3, joyScore]
  );

  return inserted.rows[0];
}

export async function analyzePatterns(db, callCouncilMember, userId) {
  if (!db || typeof db.query !== "function") {
    throw new TypeError("getGratitudeThemes requires a database client with query()");
  }
  if (typeof callCouncilMember !== "function") {
    throw new TypeError("getGratitudeThemes requires callCouncilMember");
  }
  if (!userId) {
    throw new TypeError("getGratitudeThemes requires userId");
  }

  const result = await db.query(
    `SELECT date, entry_1, entry_2, entry_3
       FROM gratitude_logs
      WHERE user_id = $1
        AND date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY date ASC, created_at ASC`,
    [userId]
  );

  const lines = [];
  for (const row of result.rows) {
    const dateLabel = row.date ? String(row.date).slice(0, 10) : "unknown-date";
    const entries = [row.entry_1, row.entry_2, row.entry_3]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);
    if (entries.length > 0) {
      lines.push(`${dateLabel}: ${entries.join(" | ")}`);
    }
  }

  const prompt = [
    "Analyze the following gratitude entries from the last 30 days.",
    "Identify recurring themes, values, emotional patterns, and any notable shifts.",
    "Return a concise theme summary string only.",
    "",
    lines.length > 0 ? lines.join("\n") : "No gratitude entries available."
  ].join("\n");

  return await callCouncilMember("analyst", prompt);
}

export async function getGratitudeScoreContribution(db, userId, date) {
  if (!db || typeof db.query !== "function") {
    throw new TypeError("getGratitudeScoreContribution requires a database client with query()");
  }
  if (!userId) {
    throw new TypeError("getGratitudeScoreContribution requires userId");
  }
  if (!date) {
    throw new TypeError("getGratitudeScoreContribution requires date");
  }

  const result = await db.query(
    `SELECT 1
       FROM gratitude_logs
      WHERE user_id = $1
        AND date = $2
      LIMIT 1`,
    [userId, date]
  );

  return result.rows.length > 0 ? 1 : 0;
}
