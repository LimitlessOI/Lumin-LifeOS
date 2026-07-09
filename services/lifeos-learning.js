/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  const title = String(data?.title ?? '').trim();
  if (!title) throw new Error('title is required');

  const type = String(data?.type ?? 'reading').trim() || 'reading';
  const url = data?.url == null ? null : String(data.url).trim() || null;
  const keyInsight = data?.key_insight == null ? null : String(data.key_insight).trim() || null;
  const status = normalizeStatus(data?.status ?? 'queued');

  const result = await db.query(
    `INSERT INTO learning_queue (user_id, title, type, url, status, key_insight)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at`,
    [userId, title, type, url, status, keyInsight]
  );

  return result.rows[0] ?? null;
}

export async function listItems(db, userId, { status } = {}) {
  const params = [userId];
  let where = `user_id = $1`;

  if (status != null && String(status).trim() !== '') {
    params.push(normalizeStatus(status));
    where += ` AND status = $2`;
  }

  const result = await db.query(
    `SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
     FROM learning_queue
     WHERE ${where}
     ORDER BY created_at DESC, id DESC`,
    params
  );

  return result.rows;
}

export async function updateItem(db, userId, id, patch = {}) {
  const updates = [];
  const params = [];
  let idx = 1;

  if (patch.status !== undefined) {
    updates.push(`status = $${idx++}`);
    params.push(normalizeStatus(patch.status));
  }

  if (patch.key_insight !== undefined) {
    updates.push(`key_insight = $${idx++}`);
    params.push(patch.key_insight == null ? null : String(patch.key_insight).trim() || null);
  }

  if (updates.length === 0) {
    const current = await db.query(
      `SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
       FROM learning_queue
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return current.rows[0] ?? null;
  }

  params.push(id, userId);

  const result = await db.query(
    `UPDATE learning_queue
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${idx++} AND user_id = $${idx++}
     RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at`,
    params
  );

  return result.rows[0] ?? null;
}

export async function deleteItem(db, userId, id) {
  const result = await db.query(
    `DELETE FROM learning_queue
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [id, userId]
  );

  return result.rowCount > 0;
}

function normalizeStatus(status) {
  const value = String(status ?? '').trim().toLowerCase();
  if (value === 'queued' || value === 'reading' || value === 'done') return value;
  throw new Error('invalid status');
}