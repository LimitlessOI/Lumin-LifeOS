/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  const title = String(data?.title ?? "").trim();
  if (!title) {
    throw new Error("title is required");
  }

  const type = data?.type == null ? null : String(data.type).trim() || null;
  const url = data?.url == null ? null : String(data.url).trim() || null;
  const status = normalizeStatus(data?.status, "queued");
  const keyInsight = data?.key_insight == null ? null : String(data.key_insight).trim() || null;

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
  let where = `WHERE user_id = $1`;

  if (status !== undefined && status !== null && String(status).trim() !== "") {
    params.push(normalizeStatus(status));
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
  const params = [userId, id];
  let idx = 2;

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, "status")) {
    idx += 1;
    fields.push(`status = $${idx}`);
    params.push(normalizeStatus(patch.status));
  }

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, "key_insight")) {
    idx += 1;
    const keyInsight = patch.key_insight == null ? null : String(patch.key_insight).trim() || null;
    fields.push(`key_insight = $${idx}`);
    params.push(keyInsight);
  }

  if (fields.length === 0) {
    throw new Error("No supported fields to update");
  }

  const query = `
    UPDATE learning_queue
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE user_id = $1 AND id = $2
    RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at
  `;

  const result = await db.query(query, params);
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

  return result.rowCount > 0;
}

function normalizeStatus(status, fallback) {
  const value = String(status ?? fallback ?? "").trim().toLowerCase();
  if (!value) {
    return fallback ?? "queued";
  }

  if (value === "queued" || value === "reading" || value === "done") {
    return value;
  }

  throw new Error("Invalid status");
}