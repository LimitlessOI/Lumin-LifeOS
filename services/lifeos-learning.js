/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('db.query is required');
  }
  if (!userId) {
    throw new Error('userId is required');
  }

  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  const type = typeof data?.type === 'string' ? data.type.trim() : '';
  const url = typeof data?.url === 'string' ? data.url.trim() : null;
  const status = normalizeStatus(data?.status);
  const keyInsight = typeof data?.key_insight === 'string' ? data.key_insight.trim() : null;

  if (!title) {
    throw new Error('title is required');
  }

  const { rows } = await db.query(
    `insert into learning_queue (user_id, title, type, url, status, key_insight)
     values ($1, $2, $3, $4, $5, $6)
     returning id, user_id, title, type, url, status, key_insight, created_at, updated_at`,
    [userId, title, type || null, url, status, keyInsight]
  );

  return rows[0] ?? null;
}

export async function listItems(db, userId, { status } = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('db.query is required');
  }
  if (!userId) {
    throw new Error('userId is required');
  }

  const params = [userId];
  let sql = `select id, user_id, title, type, url, status, key_insight, created_at, updated_at
             from learning_queue
             where user_id = $1`;

  if (status !== undefined && status !== null && status !== '') {
    params.push(normalizeStatus(status));
    sql += ` and status = $2`;
  }

  sql += ` order by created_at desc, id desc`;

  const { rows } = await db.query(sql, params);
  return rows;
}

export async function updateItem(db, userId, id, patch) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('db.query is required');
  }
  if (!userId) {
    throw new Error('userId is required');
  }
  if (!id) {
    throw new Error('id is required');
  }

  const fields = [];
  const values = [userId, id];

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, 'status')) {
    fields.push(`status = $${values.length + 1}`);
    values.push(normalizeStatus(patch.status));
  }
  if (Object.prototype.hasOwnProperty.call(patch ?? {}, 'key_insight')) {
    fields.push(`key_insight = $${values.length + 1}`);
    values.push(typeof patch.key_insight === 'string' ? patch.key_insight.trim() : null);
  }

  if (fields.length === 0) {
    const { rows } = await db.query(
      `select id, user_id, title, type, url, status, key_insight, created_at, updated_at
       from learning_queue
       where user_id = $1 and id = $2`,
      [userId, id]
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
    throw new Error('db.query is required');
  }
  if (!userId) {
    throw new Error('userId is required');
  }
  if (!id) {
    throw new Error('id is required');
  }

  const { rows } = await db.query(
    `delete from learning_queue
     where user_id = $1 and id = $2
     returning id`,
    [userId, id]
  );

  return rows[0] ?? null;
}

function normalizeStatus(status) {
  const value = String(status ?? '').trim().toLowerCase();
  if (value === 'queued' || value === 'reading' || value === 'done') {
    return value;
  }
  throw new Error('status must be one of queued, reading, done');
}