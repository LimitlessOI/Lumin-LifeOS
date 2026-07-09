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
  const url = typeof data?.url === 'string' ? data.url.trim() : '';
  const status = normalizeStatus(data?.status) ?? 'queued';
  const keyInsight = typeof data?.key_insight === 'string' ? data.key_insight.trim() : null;

  if (!title) {
    throw new TypeError('title is required');
  }
  if (!type) {
    throw new TypeError('type is required');
  }

  const result = await db.query(
    `
      INSERT INTO learning_queue (user_id, title, type, url, status, key_insight)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at
    `,
    [userId, title, type, url || null, status, keyInsight]
  );

  return result.rows[0] || null;
}

export async function listItems(db, userId, { status } = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db.query is required');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }

  const params = [userId];
  let sql = `
    SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
    FROM learning_queue
    WHERE user_id = $1
  `;

  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus) {
    params.push(normalizedStatus);
    sql += ` AND status = $2`;
  }

  sql += ` ORDER BY created_at DESC, id DESC`;

  const result = await db.query(sql, params);
  return result.rows;
}

export async function updateItem(db, userId, id, patch = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db.query is required');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }
  if (!id) {
    throw new TypeError('id is required');
  }

  const sets = [];
  const params = [];
  let idx = 1;

  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    const normalizedStatus = normalizeStatus(patch.status);
    if (!normalizedStatus) {
      throw new TypeError('status must be queued, reading, or done');
    }
    sets.push(`status = $${idx++}`);
    params.push(normalizedStatus);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'key_insight')) {
    const keyInsight = patch.key_insight == null ? null : String(patch.key_insight).trim();
    sets.push(`key_insight = $${idx++}`);
    params.push(keyInsight || null);
  }

  if (sets.length === 0) {
    return null;
  }

  sets.push(`updated_at = NOW()`);
  params.push(userId, id);

  const result = await db.query(
    `
      UPDATE learning_queue
      SET ${sets.join(', ')}
      WHERE user_id = $${idx++} AND id = $${idx}
      RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at
    `,
    params
  );

  return result.rows[0] || null;
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
    `
      DELETE FROM learning_queue
      WHERE user_id = $1 AND id = $2
      RETURNING id
    `,
    [userId, id]
  );

  return result.rows[0] || null;
}

function normalizeStatus(value) {
  if (value == null || value === '') {
    return null;
  }
  const status = String(value).trim().toLowerCase();
  return status === 'queued' || status === 'reading' || status === 'done' ? status : null;
}