/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  const title = normalizeTitle(data?.title);
  const type = normalizeType(data?.type);
  const url = normalizeUrl(data?.url);
  const status = normalizeStatus(data?.status);
  const keyInsight = normalizeKeyInsight(data?.key_insight);

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
  let where = `user_id = $1`;

  if (status !== undefined && status !== null && status !== "") {
    params.push(normalizeStatus(status));
    where += ` AND status = $${params.length}`;
  }

  const result = await db.query(
    `
      SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
      FROM learning_queue
      WHERE ${where}
      ORDER BY created_at DESC, id DESC
    `,
    params
  );

  return result.rows;
}

export async function updateItem(db, userId, id, patch) {
  const updates = [];
  const params = [userId, id];
  let idx = params.length;

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, "status")) {
    idx += 1;
    updates.push(`status = $${idx}`);
    params.push(normalizeStatus(patch.status));
  }

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, "key_insight")) {
    idx += 1;
    updates.push(`key_insight = $${idx}`);
    params.push(normalizeKeyInsight(patch.key_insight));
  }

  if (updates.length === 0) {
    const existing = await db.query(
      `
        SELECT id, user_id, title, type, url, status, key_insight, created_at, updated_at
        FROM learning_queue
        WHERE user_id = $1 AND id = $2
      `,
      params
    );
    return existing.rows[0] ?? null;
  }

  updates.push(`updated_at = NOW()`);

  const result = await db.query(
    `
      UPDATE learning_queue
      SET ${updates.join(", ")}
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
      RETURNING id, user_id, title, type, url, status, key_insight, created_at, updated_at
    `,
    [userId, id]
  );

  return result.rows[0] ?? null;
}

function normalizeTitle(value) {
  const title = String(value ?? "").trim();
  if (!title) {
    throw new Error("title is required");
  }
  return title;
}

function normalizeType(value) {
  const type = String(value ?? "").trim();
  if (!type) {
    throw new Error("type is required");
  }
  return type;
}

function normalizeUrl(value) {
  if (value === undefined || value === null || value === "") return null;
  const url = String(value).trim();
  return url || null;
}

function normalizeKeyInsight(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const insight = String(value).trim();
  return insight || null;
}

function normalizeStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (!status) {
    throw new Error("status is required");
  }
  if (status !== "queued" && status !== "reading" && status !== "done") {
    throw new Error("status must be one of queued, reading, done");
  }
  return status;
}