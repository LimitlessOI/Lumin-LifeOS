/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  const type = typeof data?.type === 'string' ? data.type.trim() : '';
  const url = typeof data?.url === 'string' ? data.url.trim() : null;

  if (!title) {
    throw new Error('title is required');
  }

  const status = 'queued';
  const keyInsight = typeof data?.key_insight === 'string' ? data.key_insight.trim() : null;

  const result = await db.query(
    `
      INSERT INTO learning_queue (user_id, title, type, url, status, key_insight)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at
    `,
    [userId, title, type || null, url, status, keyInsight]
  );

  return result.rows[0] ?? null;
}

export async function listItems(db, userId, { status } = {}) {
  const params = [userId];
  let sql = `
    SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
    FROM learning_queue
    WHERE user_id = $1
  `;

  if (status) {
    params.push(status);
    sql += ` AND status = $2`;
  }

  sql += ` ORDER BY created_at DESC, id DESC`;

  const result = await db.query(sql, params);
  return result.rows;
}

export async function updateItem(db, userId, id, patch) {
  const sets = [];
  const params = [userId, id];
  let idx = 3;

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, 'status')) {
    const status = patch.status;
    if (!['queued', 'reading', 'done'].includes(status)) {
      throw new Error('invalid status');
    }
    sets.push(`status = $${idx++}`);
    params.push(status);
  }

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, 'key_insight')) {
    const keyInsight =
      typeof patch.key_insight === 'string' ? patch.key_insight.trim() : null;
    sets.push(`key_insight = $${idx++}`);
    params.push(keyInsight);
  }

  if (sets.length === 0) {
    return null;
  }

  sets.push(`updated_at = now()`);

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
  const result = await db.query(
    `
      DELETE FROM learning_queue
      WHERE user_id = $1 AND id = $2
      RETURNING id
    `,
    [userId, id]
  );

  return result.rows[0] ?? null;
}