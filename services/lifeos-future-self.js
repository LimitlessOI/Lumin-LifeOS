/**
 * SYNOPSIS: Exports createLetter — services/lifeos-future-self.js.
 */
export async function createLetter(db, userId, content, deliverOn) {
  const result = await db.query(
    `INSERT INTO future_self_letters (user_id, content, deliver_on, delivered)
     VALUES ($1, $2, $3, false)
     RETURNING *`,
    [userId, content, deliverOn]
  );

  return result.rows[0];
}

export async function checkAndDeliverLetters(db, notifyFn) {
  const { rows } = await db.query(
    `SELECT id, user_id, content, deliver_on, delivered, created_at
     FROM future_self_letters
     WHERE deliver_on <= CURRENT_DATE
       AND delivered = false
     ORDER BY deliver_on ASC, created_at ASC, id ASC`
  );

  const deliveredLetters = [];

  for (const row of rows) {
    try {
      await notifyFn(row.user_id, row.content);
      await db.query(
        `UPDATE future_self_letters
         SET delivered = true
         WHERE id = $1`,
        [row.id]
      );
      deliveredLetters.push(row.id);
    } catch (error) {
      // Keep processing other letters; caller can inspect logs/side effects.
      continue;
    }
  }

  return deliveredLetters;
}

export async function getLetters(db, userId) {
  const result = await db.query(
    `SELECT id, user_id, content, deliver_on, delivered, created_at
     FROM future_self_letters
     WHERE user_id = $1
     ORDER BY created_at ASC, id ASC`,
    [userId]
  );

  return result.rows;
}