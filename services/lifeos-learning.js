/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  const type = typeof data?.type === 'string' ? data.type.trim() : '';
  const url = typeof data?.url === 'string' ? data.url.trim() : null;
  const status = normalizeStatus(data?.status);
  const keyInsight = typeof data?.key_insight === 'string' ? data.key_insight.trim() : null;

  const { rows } = await db.query(
    `insert into learning_queue (user_id, title, type, url, status, key_insight)
     values ($1, $2, $3, $4, $5, $6)
     returning id, user_id, title, type, url, status, key_insight, created_at, updated_at`,
    [userId, title, type, url, status, keyInsight]
  );

  return rows[0];
}

export async function listItems(db, userId, { status } = {}) {
  const params = [userId];
  let where = `where user_id = $1`;

  const normalizedStatus = status == null ? null : normalizeStatus(status);
  if (normalizedStatus) {
    params.push(normalizedStatus);
    where += ` and status = $${params.length}`;
  }

  const { rows } = await db.query(
    `select id, user_id, title, type, url, status, key_insight, created_at, updated_at
     from learning_queue
     ${where}
     order by created_at desc, id desc`,
    params
  );

  return rows;
}

export async function updateItem(db, userId, id, patch) {
  const fields = [];
  const params = [userId, id];
  let idx = 2;

  if (Object.prototype.hasOwnProperty.call(patch || {}, 'status')) {
    const status = normalizeStatus(patch.status);
    idx += 1;
    fields.push(`status = $${idx}`);
    params.push(status);
  }

  if (Object.prototype.hasOwnProperty.call(patch || {}, 'key_insight')) {
    idx += 1;
    fields.push(`key_insight = $${idx}`);
    params.push(typeof patch.key_insight === 'string' ? patch.key_insight.trim() : null);
  }

  if (fields.length === 0) {
    const existing = await db.query(
      `select id, user_id, title, type, url, status, key_insight, created_at, updated_at
       from learning_queue
       where user_id = $1 and id = $2`,
      [userId, id]
    );
    return existing.rows[0] || null;
  }

  params.push(id);
  const setClause = `${fields.join(', ')}, updated_at = now()`;

  const { rows } = await db.query(
    `update learning_queue
     set ${setClause}
     where user_id = $1 and id = $2
     returning id, user_id, title, type, url, status, key_insight, created_at, updated_at`,
    params
  );

  return rows[0] || null;
}

export async function deleteItem(db, userId, id) {
  const { rows } = await db.query(
    `delete from learning_queue
     where user_id = $1 and id = $2
     returning id`,
    [userId, id]
  );

  return rows[0] || null;
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (!status) return 'queued';
  if (status === 'queued' || status === 'reading' || status === 'done') return status;
  throw new Error('Invalid learning_queue status');
}