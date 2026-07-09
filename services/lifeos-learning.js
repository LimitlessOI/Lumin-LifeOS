/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  if (!title) throw new Error('title is required');

  const type = typeof data?.type === 'string' ? data.type.trim() : null;
  const url = typeof data?.url === 'string' ? data.url.trim() : null;
  const status = normalizeStatus(data?.status ?? 'queued');
  const keyInsight = normalizeText(data?.key_insight);

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
  const params = [userId];
  let where = 'WHERE user_id = $1';

  if (status !== undefined && status !== null && status !== '') {
    const normalized = normalizeStatus(status);
    params.push(normalized);
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
  const fields = [];
  const params = [];
  let idx = 0;

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, 'status')) {
    idx += 1;
    fields.push(`status = $${idx}`);
    params.push(normalizeStatus(patch.status));
  }

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, 'key_insight')) {
    idx += 1;
    fields.push(`key_insight = $${idx}`);
    params.push(normalizeText(patch.key_insight));
  }

  if (fields.length === 0) throw new Error('No valid patch fields provided');

  idx += 1;
  fields.push(`updated_at = now()`);
  params.push(id);

  idx += 1;
  const userParamIndex = idx;
  params.push(userId);

  const result = await db.query(
    `
      UPDATE learning_queue
      SET ${fields.join(', ')}
      WHERE id = $${params.length - 1} AND user_id = $${params.length}
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
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `,
    [id, userId]
  );

  return result.rows[0] ?? null;
}

function normalizeStatus(value) {
  const status = String(value ?? '').trim().toLowerCase();
  if (status === 'queued' || status === 'reading' || status === 'done') return status;
  throw new Error('Invalid status');
}

function normalizeText(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}