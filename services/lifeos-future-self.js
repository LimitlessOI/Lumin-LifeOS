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

  return result.rows[0] ?? null;
}

export async function checkAndDeliverLetters(db, notifyFn) {
  const result = await db.query(
    `SELECT id, user_id, content, deliver_on, delivered, created_at
     FROM future_self_letters
     WHERE deliver_on <= CURRENT_DATE
       AND delivered = false
     ORDER BY deliver_on ASC, created_at ASC`
  );

  const deliveredLetters = [];

  for (const row of result.rows) {
    await notifyFn(row.user_id, row.content);

    const updateResult = await db.query(
      `UPDATE future_self_letters
       SET delivered = true
       WHERE id = $1
       RETURNING *`,
      [row.id]
    );

    deliveredLetters.push(updateResult.rows[0] ?? row);
  }

  return deliveredLetters;
}

export async function getLetters(db, userId) {
  const result = await db.query(
    `SELECT id, user_id, content, deliver_on, delivered, created_at
     FROM future_self_letters
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}