/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
const TABLE = 'learning_queue';

function assertDb(db) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('db must be a node-postgres client or pool with query()');
  }
}

function normalizeStatus(status) {
  if (status == null || status === '') return null;
  const value = String(status).trim().toLowerCase();
  if (!['queued', 'reading', 'done'].includes(value)) {
    throw new RangeError('status must be one of queued, reading, done');
  }
  return value;
}

function normalizeString(value, fieldName, { required = false, maxLen = 2048 } = {}) {
  if (value == null) {
    if (required) throw new TypeError(`${fieldName} is required`);
    return null;
  }
  const s = String(value).trim();
  if (!s) {
    if (required) throw new TypeError(`${fieldName} is required`);
    return null;
  }
  if (s.length > maxLen) {
    throw new RangeError(`${fieldName} is too long`);
  }
  return s;
}

function normalizeUrl(value) {
  const s = normalizeString(value, 'url', { required: false, maxLen: 2048 });
  return s;
}

function buildSelectClause() {
  return `SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
          FROM ${TABLE}`;
}

export async function addItem(db, userId, data = {}) {
  assertDb(db);
  if (userId == null || userId === '') throw new TypeError('userId is required');

  const title = normalizeString(data.title, 'title', { required: true, maxLen: 500 });
  const type = normalizeString(data.type, 'type', { required: false, maxLen: 100 });
  const url = normalizeUrl(data.url);
  const status = normalizeStatus(data.status) ?? 'queued';
  const keyInsight = normalizeString(data.key_insight, 'key_insight', { required: false, maxLen: 4000 });

  const result = await db.query(
    `INSERT INTO ${TABLE} (user_id, title, type, url, status, key_insight)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at`,
    [userId, title, type, url, status, keyInsight]
  );

  return result.rows[0] ?? null;
}

export async function listItems(db, userId, { status } = {}) {
  assertDb(db);
  if (userId == null || userId === '') throw new TypeError('userId is required');

  const params = [userId];
  let sql = `${buildSelectClause()} WHERE user_id = $1`;
  const normalizedStatus = status == null || status === '' ? null : normalizeStatus(status);
  if (normalizedStatus) {
    params.push(normalizedStatus);
    sql += ` AND status = $2`;
  }
  sql += ` ORDER BY created_at DESC`;

  const result = await db.query(sql, params);
  return result.rows;
}

export async function updateItem(db, userId, id, patch = {}) {
  assertDb(db);
  if (userId == null || userId === '') throw new TypeError('userId is required');
  if (id == null || id === '') throw new TypeError('id is required');

  const sets = [];
  const params = [];
  let i = 1;

  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    params.push(normalizeStatus(patch.status));
    sets.push(`status = $${i++}`);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'key_insight')) {
    params.push(normalizeString(patch.key_insight, 'key_insight', { required: false, maxLen: 4000 }));
    sets.push(`key_insight = $${i++}`);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'title')) {
    params.push(normalizeString(patch.title, 'title', { required: false, maxLen: 500 }));
    sets.push(`title = $${i++}`);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'type')) {
    params.push(normalizeString(patch.type, 'type', { required: false, maxLen: 100 }));
    sets.push(`type = $${i++}`);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'url')) {
    params.push(normalizeUrl(patch.url));
    sets.push(`url = $${i++}`);
  }

  if (sets.length === 0) {
    const existing = await db.query(
      `${buildSelectClause()} WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return existing.rows[0] ?? null;
  }

  params.push(id, userId);
  const sql = `
    UPDATE ${TABLE}
    SET ${sets.join(', ')}, updated_at = NOW()
    WHERE id = $${i++} AND user_id = $${i++}
    RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at
  `;

  const result = await db.query(sql, params);
  return result.rows[0] ?? null;
}

export async function deleteItem(db, userId, id) {
  assertDb(db);
  if (userId == null || userId === '') throw new TypeError('userId is required');
  if (id == null || id === '') throw new TypeError('id is required');

  const result = await db.query(
    `DELETE FROM ${TABLE}
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [id, userId]
  );

  return result.rows[0] ?? null;
}