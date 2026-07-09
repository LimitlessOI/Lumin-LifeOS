/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  if (!db || typeof db.query !== 'function') throw new TypeError('db.query is required');
  if (!userId) throw new TypeError('userId is required');

  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  const type = typeof data?.type === 'string' ? data.type.trim() : '';
  const url = typeof data?.url === 'string' ? data.url.trim() : null;
  const status = normalizeStatus(data?.status ?? 'queued');
  const keyInsight = typeof data?.key_insight === 'string' ? data.key_insight.trim() : null;

  if (!title) throw new TypeError('title is required');
  if (!type) throw new TypeError('type is required');

  const result = await db.query(
    `
      INSERT INTO learning_queue (user_id, title, type, url, status, key_insight)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at
    `,
    [userId, title, type, url, status, keyInsight]
  );

  return result.rows[0] ?? null;
}

export async function listItems(db, userId, { status } = {}) {
  if (!db || typeof db.query !== 'function') throw new TypeError('db.query is required');
  if (!userId) throw new TypeError('userId is required');

  const params = [userId];
  let where = 'WHERE user_id = $1';

  if (status !== undefined && status !== null && status !== '') {
    params.push(normalizeStatus(status));
    where += ` AND status = $${params.length}`;
  }

  const result = await db.query(
    `
      SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
      FROM learning_queue
      ${where}
      ORDER BY created_at DESC, id DESC
    `,
    params
  );

  return result.rows;
}

export async function updateItem(db, userId, id, patch) {
  if (!db || typeof db.query !== 'function') throw new TypeError('db.query is required');
  if (!userId) throw new TypeError('userId is required');
  if (!id) throw new TypeError('id is required');
  if (!patch || typeof patch !== 'object') throw new TypeError('patch is required');

  const sets = [];
  const params = [userId, id];
  let idx = 3;

  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    sets.push(`status = $${idx++}`);
    params.push(normalizeStatus(patch.status));
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'key_insight')) {
    sets.push(`key_insight = $${idx++}`);
    const insight = patch.key_insight == null ? null : String(patch.key_insight).trim();
    params.push(insight || null);
  }

  if (sets.length === 0) {
    const existing = await db.query(
      `
        SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
        FROM learning_queue
        WHERE user_id = $1 AND id = $2
      `,
      params
    );
    return existing.rows[0] ?? null;
  }

  sets.push(`updated_at = NOW()`);

  const result = await db.query(
    `
      UPDATE learning_queue
      SET ${sets.join(', ')}
      WHERE user_id = $1 AND id = $2
      RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at
    `,
    params
  );

  return result.rows[0] ?? null;
}

export async function deleteItem(db, userId, id) {
  if (!db || typeof db.query !== 'function') throw new TypeError('db.query is required');
  if (!userId) throw new TypeError('userId is required');
  if (!id) throw new TypeError('id is required');

  const result = await db.query(
    `
      DELETE FROM learning_queue
      WHERE user_id = $1 AND id = $2
      RETURNING id
    `,
    [userId, id]
  );

  return result.rowCount > 0;
}

function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'queued' || value === 'reading' || value === 'done') return value;
  throw new TypeError('status must be one of queued, reading, done');
}