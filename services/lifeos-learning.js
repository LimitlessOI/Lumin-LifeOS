/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  const type = typeof data?.type === 'string' ? data.type.trim() : null;
  const url = typeof data?.url === 'string' ? data.url.trim() : null;
  const status = normalizeStatus(data?.status) ?? 'queued';
  const keyInsight = normalizeText(data?.key_insight);

  if (!title) {
    throw new Error('title is required');
  }

  const result = await db.query(
    `
      INSERT INTO learning_queue (user_id, title, type, url, status, key_insight)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [userId, title, type, url, status, keyInsight],
  );

  return result.rows[0] ?? null;
}

export async function listItems(db, userId, { status } = {}) {
  const params = [userId];
  let sql = `
    SELECT *
    FROM learning_queue
    WHERE user_id = $1
  `;

  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus) {
    params.push(normalizedStatus);
    sql += ` AND status = $2`;
  }

  sql += `
    ORDER BY created_at DESC, id DESC
  `;

  const result = await db.query(sql, params);
  return result.rows;
}

export async function updateItem(db, userId, id, patch = {}) {
  const updates = [];
  const params = [];
  let idx = 1;

  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    const normalizedStatus = normalizeStatus(patch.status);
    if (!normalizedStatus) {
      throw new Error('invalid status');
    }
    updates.push(`status = $${idx++}`);
    params.push(normalizedStatus);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'key_insight')) {
    updates.push(`key_insight = $${idx++}`);
    params.push(normalizeText(patch.key_insight));
  }

  if (updates.length === 0) {
    const existing = await db.query(
      `
        SELECT *
        FROM learning_queue
        WHERE id = $1 AND user_id = $2
        LIMIT 1
      `,
      [id, userId],
    );
    return existing.rows[0] ?? null;
  }

  updates.push(`updated_at = now()`);
  params.push(id, userId);

  const result = await db.query(
    `
      UPDATE learning_queue
      SET ${updates.join(', ')}
      WHERE id = $${idx++} AND user_id = $${idx++}
      RETURNING *
    `,
    params,
  );

  return result.rows[0] ?? null;
}

export async function deleteItem(db, userId, id) {
  const result = await db.query(
    `
      DELETE FROM learning_queue
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `,
    [id, userId],
  );

  return result.rows[0] ?? null;
}

function normalizeStatus(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized === 'queued' || normalized === 'reading' || normalized === 'done'
    ? normalized
    : null;
}

function normalizeText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}