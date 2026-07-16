/**
 * SYNOPSIS: Exports logGratitude — services/lifeos-gratitude.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
export async function logGratitude(db, userId, date, entries, joyScore = 0) {
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
    `SELECT id FROM gratitude_logs WHERE user_id = $1 AND date = $2 LIMIT 1`,
    [userId, date]
  );

  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    const result = await db.query(
      `UPDATE gratitude_logs
        SET entry_1 = $1,
            entry_2 = $2,
            entry_3 = $3,
            joy_score = $4,
            updated_at = NOW()
        WHERE id = $5
        RETURNING *`,
      [entry1, entry2, entry3, joyScore, id]
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

export async function analyzePatterns(db, userId) {
  const themes = await getGratitudeThemes(db, userId);
  // Additional analysis logic based on themes
  // For simplicity, let's assume it returns a summary string
  return `Analysis Summary: ${themes}`;
}

