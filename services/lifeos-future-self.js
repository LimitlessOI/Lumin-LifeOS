/**
 * SYNOPSIS: Exports scheduleLetterDelivery — services/lifeos-future-self.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

export async function scheduleLetterDelivery(db, userId, content, deliverOn) {
  // Check if the deliverOn date is in the future
  if (new Date(deliverOn) <= new Date()) {
    throw new Error('Deliver date must be in the future.');
  }

  // Call the createLetter function to insert the letter into the database
  return await createLetter(db, userId, content, deliverOn);
}

async function createLetter(db, userId, content, deliverOn) {
  const tableCheck = await db.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='future_self_letters'"
  );
  if (!tableCheck.rowCount) {
    throw new Error('future_self_letters table does not exist yet.');
  }

  const result = await db.query(
    'INSERT INTO future_self_letters (user_id, content, deliver_on, delivered) VALUES ($1, $2, $3, false) RETURNING id',
    [userId, content, deliverOn]
  );
  return result.rows[0];
}

export async function checkAndDeliverLetters(db, notifyFn) {
  const tableCheck = await db.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='future_self_letters'"
  );
  if (!tableCheck.rowCount) return [];

  const due = await db.query(
    `SELECT id, user_id, content FROM future_self_letters
     WHERE deliver_on <= NOW() AND delivered = false
     ORDER BY deliver_on ASC`
  );

  const delivered = [];
  for (const row of due.rows || []) {
    try {
      await notifyFn(row.user_id, row.content);
      await db.query(
        'UPDATE future_self_letters SET delivered = true WHERE id = $1',
        [row.id]
      );
      delivered.push(row.id);
    } catch (err) {
      // Leave the letter queued for the next tick if delivery fails.
    }
  }
  return delivered;
}
