/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db must expose query(sql, params)');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }

  const title = normalizeText(data?.title);
  if (!title) {
    throw new TypeError('title is required');
  }

  const type = normalizeText(data?.type) || 'reading';
  const url = normalizeNullableText(data?.url);
  const keyInsight = normalizeNullableText(data?.key_insight);
  const status = normalizeStatus(data?.status) || 'queued';

  const { rows } = await db.query(
    `
      INSERT INTO learning_queue (user_id, title, type, url, status, key_insight)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [userId, title, type, url, status, keyInsight]
  );

  return rows[0] ?? null;
}

export async function listItems(db, userId, { status } = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db must expose query(sql, params)');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }

  const params = [userId];
  let where = 'WHERE user_id = $1';

  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus) {
    params.push(normalizedStatus);
    where += ` AND status = $${params.length}`;
  }

  const { rows } = await db.query(
    `
      SELECT *
      FROM learning_queue
      ${where}
      ORDER BY created_at DESC, id DESC
    `,
    params
  );

  return rows;
}

export async function updateItem(db, userId, id, patch) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db must expose query(sql, params)');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }
  if (!id) {
    throw new TypeError('id is required');
  }
  if (!patch || typeof patch !== 'object') {
    throw new TypeError('patch must be an object');
  }

  const sets = [];
  const params = [userId, id];
  let index = params.length;

  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    const status = normalizeStatus(patch.status);
    if (!status) {
      throw new TypeError('status must be one of queued, reading, done');
    }
    index += 1;
    params.push(status);
    sets.push(`status = $${index}`);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'key_insight')) {
    index += 1;
    params.push(normalizeNullableText(patch.key_insight));
    sets.push(`key_insight = $${index}`);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'title')) {
    const title = normalizeText(patch.title);
    if (!title) {
      throw new TypeError('title cannot be empty');
    }
    index += 1;
    params.push(title);
    sets.push(`title = $${index}`);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'type')) {
    const type = normalizeText(patch.type);
    if (!type) {
      throw new TypeError('type cannot be empty');
    }
    index += 1;
    params.push(type);
    sets.push(`type = $${index}`);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'url')) {
    index += 1;
    params.push(normalizeNullableText(patch.url));
    sets.push(`url = $${index}`);
  }

  if (sets.length === 0) {
    const existing = await db.query(
      `SELECT * FROM learning_queue WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return existing.rows[0] ?? null;
  }

  sets.push('updated_at = NOW()');

  const { rows } = await db.query(
    `
      UPDATE learning_queue
      SET ${sets.join(', ')}
      WHERE user_id = $1 AND id = $2
      RETURNING *
    `,
    params
  );

  return rows[0] ?? null;
}

export async function deleteItem(db, userId, id) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db must expose query(sql, params)');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }
  if (!id) {
    throw new TypeError('id is required');
  }

  const { rows } = await db.query(
    `
      DELETE FROM learning_queue
      WHERE user_id = $1 AND id = $2
      RETURNING *
    `,
    [userId, id]
  );

  return rows[0] ?? null;
}

function normalizeStatus(value) {
  const s = normalizeText(value);
  if (!s) return null;
  if (s === 'queued' || s === 'reading' || s === 'done') return s;
  return null;
}

function normalizeText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeNullableText(value) {
  const s = normalizeText(value);
  return s ? s : null;
}