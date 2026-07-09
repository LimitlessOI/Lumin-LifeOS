/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db.query is required');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }

  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  if (!title) {
    throw new TypeError('title is required');
  }

  const type = typeof data?.type === 'string' && data.type.trim() ? data.type.trim() : null;
  const url = typeof data?.url === 'string' && data.url.trim() ? data.url.trim() : null;
  const status = typeof data?.status === 'string' && data.status.trim() ? data.status.trim() : 'queued';
  const keyInsight = typeof data?.key_insight === 'string' && data.key_insight.trim() ? data.key_insight.trim() : null;

  const result = await db.query(
    `INSERT INTO learning_queue (user_id, title, type, url, status, key_insight)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, title, type, url, status, keyInsight]
  );

  return result.rows[0] ?? null;
}

export async function listItems(db, userId, { status } = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db.query is required');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }

  const params = [userId];
  let where = 'user_id = $1';

  if (typeof status === 'string' && status.trim()) {
    params.push(status.trim());
    where += ` AND status = $${params.length}`;
  }

  const result = await db.query(
    `SELECT *
     FROM learning_queue
     WHERE ${where}
     ORDER BY created_at DESC, id DESC`,
    params
  );

  return result.rows;
}

export async function updateItem(db, userId, id, patch) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db.query is required');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }
  if (!id) {
    throw new TypeError('id is required');
  }

  const updates = [];
  const params = [];
  let i = 1;

  if (patch && Object.prototype.hasOwnProperty.call(patch, 'status')) {
    const status = typeof patch.status === 'string' ? patch.status.trim() : '';
    if (!['queued', 'reading', 'done'].includes(status)) {
      throw new TypeError('status must be queued, reading, or done');
    }
    updates.push(`status = $${i++}`);
    params.push(status);
  }

  if (patch && Object.prototype.hasOwnProperty.call(patch, 'key_insight')) {
    const keyInsight =
      typeof patch.key_insight === 'string' && patch.key_insight.trim() ? patch.key_insight.trim() : null;
    updates.push(`key_insight = $${i++}`);
    params.push(keyInsight);
  }

  if (!updates.length) {
    const current = await db.query(
      `SELECT *
       FROM learning_queue
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [id, userId]
    );
    return current.rows[0] ?? null;
  }

  updates.push(`updated_at = now()`);
  params.push(id, userId);

  const result = await db.query(
    `UPDATE learning_queue
     SET ${updates.join(', ')}
     WHERE id = $${i++} AND user_id = $${i++}
     RETURNING *`,
    params
  );

  return result.rows[0] ?? null;
}

export async function deleteItem(db, userId, id) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db.query is required');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }
  if (!id) {
    throw new TypeError('id is required');
  }

  const result = await db.query(
    `DELETE FROM learning_queue
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  );

  return result.rows[0] ?? null;
}