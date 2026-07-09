/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  if (!title) {
    throw new Error('title is required');
  }

  const type = typeof data?.type === 'string' ? data.type.trim() : null;
  const url = typeof data?.url === 'string' ? data.url.trim() : null;
  const status = normalizeStatus(data?.status) ?? 'queued';
  const keyInsight = typeof data?.key_insight === 'string' ? data.key_insight.trim() : null;

  const result = await db.query(
    `INSERT INTO learning_queue (user_id, title, type, url, status, key_insight)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, title, type, url, status, keyInsight]
  );

  return result.rows[0] ?? null;
}

export async function listItems(db, userId, { status } = {}) {
  const params = [userId];
  let where = 'WHERE user_id = $1';

  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus) {
    params.push(normalizedStatus);
    where += ` AND status = $${params.length}`;
  }

  const result = await db.query(
    `SELECT *
     FROM learning_queue
     ${where}
     ORDER BY created_at DESC, id DESC`,
    params
  );

  return result.rows;
}

export async function updateItem(db, userId, id, patch) {
  const sets = [];
  const params = [userId, id];

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, 'status')) {
    const status = normalizeStatus(patch.status);
    if (!status) {
      throw new Error('invalid status');
    }
    params.push(status);
    sets.push(`status = $${params.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, 'key_insight')) {
    const keyInsight = patch.key_insight == null ? null : String(patch.key_insight).trim();
    params.push(keyInsight || null);
    sets.push(`key_insight = $${params.length}`);
  }

  if (sets.length === 0) {
    return null;
  }

  sets.push('updated_at = NOW()');
  params.push(userId);
  params.push(id);

  const result = await db.query(
    `UPDATE learning_queue
     SET ${sets.join(', ')}
     WHERE user_id = $1 AND id = $2
     RETURNING *`,
    params.slice(0, 2).concat(params.slice(2, -2))
  );

  return result.rows[0] ?? null;
}

export async function deleteItem(db, userId, id) {
  const result = await db.query(
    `DELETE FROM learning_queue
     WHERE user_id = $1 AND id = $2
     RETURNING *`,
    [userId, id]
  );

  return result.rows[0] ?? null;
}

function normalizeStatus(value) {
  if (typeof value !== 'string') return null;
  const status = value.trim().toLowerCase();
  return status === 'queued' || status === 'reading' || status === 'done' ? status : null;
}