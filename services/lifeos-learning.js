/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export function addItem(db, userId, data) {
  return db.query(
    `
      INSERT INTO learning_queue (user_id, title, type, url, status, key_insight)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at
    `,
    [
      userId,
      data?.title ?? null,
      data?.type ?? null,
      data?.url ?? null,
      data?.status ?? 'queued',
      data?.key_insight ?? null,
    ],
  ).then((result) => result.rows[0]);
}

export function listItems(db, userId, { status } = {}) {
  const params = [userId];
  let sql = `
    SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
    FROM learning_queue
    WHERE user_id = $1
  `;

  if (status) {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }

  sql += ` ORDER BY created_at DESC, id DESC`;

  return db.query(sql, params).then((result) => result.rows);
}

export async function updateItem(db, userId, id, patch) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, 'status')) {
    fields.push(`status = $${idx++}`);
    values.push(patch.status);
  }

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, 'key_insight')) {
    fields.push(`key_insight = $${idx++}`);
    values.push(patch.key_insight);
  }

  if (!fields.length) {
    const result = await db.query(
      `
        SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
        FROM learning_queue
        WHERE id = $1 AND user_id = $2
      `,
      [id, userId],
    );
    return result.rows[0] ?? null;
  }

  values.push(id, userId);

  const result = await db.query(
    `
      UPDATE learning_queue
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${idx++} AND user_id = $${idx++}
      RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at
    `,
    values,
  );

  return result.rows[0] ?? null;
}

export async function deleteItem(db, userId, id) {
  const result = await db.query(
    `
      DELETE FROM learning_queue
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `,
    [id, userId],
  );

  return result.rows[0] ?? null;
}