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
  const type = typeof data?.type === 'string' ? data.type.trim() : '';
  const url = typeof data?.url === 'string' ? data.url.trim() : null;
  const status = normalizeStatus(data?.status, 'queued');
  const keyInsight = typeof data?.key_insight === 'string' ? data.key_insight.trim() : null;

  if (!title) throw new TypeError('title is required');
  if (!type) throw new TypeError('type is required');

  const result = await db.query(
    `INSERT INTO learning_queue (user_id, title, type, url, status, key_insight)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at`,
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

  const values = [userId];
  let where = 'WHERE user_id = $1';

  if (status) {
    values.push(normalizeStatus(status));
    where += ` AND status = $2`;
  }

  const result = await db.query(
    `SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
     FROM learning_queue
     ${where}
     ORDER BY created_at DESC, id DESC`,
    values
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
  if (!patch || typeof patch !== 'object') {
    throw new TypeError('patch is required');
  }

  const fields = [];
  const values = [userId, id];
  let idx = 3;

  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    fields.push(`status = $${idx++}`);
    values.push(normalizeStatus(patch.status));
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'key_insight')) {
    fields.push(`key_insight = $${idx++}`);
    values.push(
      typeof patch.key_insight === 'string' ? patch.key_insight.trim() || null : null
    );
  }

  if (fields.length === 0) {
    const existing = await db.query(
      `SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
       FROM learning_queue
       WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return existing.rows[0] ?? null;
  }

  fields.push('updated_at = now()');

  const result = await db.query(
    `UPDATE learning_queue
     SET ${fields.join(', ')}
     WHERE user_id = $1 AND id = $2
     RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at`,
    values
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
     WHERE user_id = $1 AND id = $2
     RETURNING id`,
    [userId, id]
  );

  return result.rowCount > 0;
}

function normalizeStatus(status, fallback) {
  const value = typeof status === 'string' ? status.trim().toLowerCase() : fallback;
  if (value === 'queued' || value === 'reading' || value === 'done') {
    return value;
  }
  if (fallback && (fallback === 'queued' || fallback === 'reading' || fallback === 'done')) {
    return fallback;
  }
  throw new TypeError('status must be queued, reading, or done');
}