/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db must be a pg Pool/client with query()');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }

  const title = normalizeText(data?.title);
  const url = normalizeUrl(data?.url);
  const type = normalizeText(data?.type) || null;
  const status = normalizeStatus(data?.status) || 'queued';
  const keyInsight = normalizeText(data?.key_insight) || null;

  if (!title) {
    throw new TypeError('title is required');
  }

  const { rows } = await db.query(
    `insert into learning_queue (user_id, title, type, url, status, key_insight)
     values ($1, $2, $3, $4, $5, $6)
     returning id, user_id, title, type, url, status, key_insight, created_at, updated_at`,
    [userId, title, type, url, status, keyInsight]
  );

  return rows[0] ?? null;
}

export async function listItems(db, userId, { status } = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db must be a pg Pool/client with query()');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }

  const values = [userId];
  let where = 'where user_id = $1';

  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus) {
    values.push(normalizedStatus);
    where += ` and status = $${values.length}`;
  }

  const { rows } = await db.query(
    `select id, user_id, title, type, url, status, key_insight, created_at, updated_at
     from learning_queue
     ${where}
     order by created_at desc, id desc`,
    values
  );

  return rows;
}

export async function updateItem(db, userId, id, patch) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db must be a pg Pool/client with query()');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }
  if (!id) {
    throw new TypeError('id is required');
  }

  const fields = [];
  const values = [userId, id];

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, 'status')) {
    const status = normalizeStatus(patch.status);
    if (!status) {
      throw new TypeError('status must be one of queued, reading, done');
    }
    fields.push(`status = $${values.length + 1}`);
    values.push(status);
  }

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, 'key_insight')) {
    fields.push(`key_insight = $${values.length + 1}`);
    values.push(normalizeText(patch.key_insight) || null);
  }

  if (fields.length === 0) {
    const { rows } = await db.query(
      `select id, user_id, title, type, url, status, key_insight, created_at, updated_at
       from learning_queue
       where user_id = $1 and id = $2`,
      values
    );
    return rows[0] ?? null;
  }

  fields.push(`updated_at = now()`);

  const { rows } = await db.query(
    `update learning_queue
     set ${fields.join(', ')}
     where user_id = $1 and id = $2
     returning id, user_id, title, type, url, status, key_insight, created_at, updated_at`,
    values
  );

  return rows[0] ?? null;
}

export async function deleteItem(db, userId, id) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db must be a pg Pool/client with query()');
  }
  if (!userId) {
    throw new TypeError('userId is required');
  }
  if (!id) {
    throw new TypeError('id is required');
  }

  const { rows } = await db.query(
    `delete from learning_queue
     where user_id = $1 and id = $2
     returning id, user_id, title, type, url, status, key_insight, created_at, updated_at`,
    [userId, id]
  );

  return rows[0] ?? null;
}

function normalizeText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeUrl(value) {
  const text = normalizeText(value);
  return text;
}

function normalizeStatus(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized === 'queued' || normalized === 'reading' || normalized === 'done' ? normalized : null;
}