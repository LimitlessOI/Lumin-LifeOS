/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  if (!db) throw new Error("db is required");
  if (!userId) throw new Error("userId is required");

  const title = typeof data?.title === "string" ? data.title.trim() : "";
  if (!title) throw new Error("title is required");

  const type = typeof data?.type === "string" ? data.type.trim() : null;
  const url = typeof data?.url === "string" ? data.url.trim() : null;
  const status = normalizeStatus(data?.status) ?? "queued";
  const keyInsight = typeof data?.key_insight === "string" ? data.key_insight.trim() : null;

  const result = await db.query(
    `INSERT INTO learning_queue (user_id, title, type, url, status, key_insight)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, title, type, url, status, keyInsight]
  );

  return result.rows[0] ?? null;
}

export async function listItems(db, userId, { status } = {}) {
  if (!db) throw new Error("db is required");
  if (!userId) throw new Error("userId is required");

  const params = [userId];
  let where = "WHERE user_id = $1";

  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus) {
    params.push(normalizedStatus);
    where += ` AND status = $${params.length}`;
  }

  const result = await db.query(
    `SELECT *
     FROM learning_queue
     ${where}
     ORDER BY created_at DESC, id DESC`,
    params
  );

  return result.rows;
}

export async function updateItem(db, userId, id, patch) {
  if (!db) throw new Error("db is required");
  if (!userId) throw new Error("userId is required");
  if (!id) throw new Error("id is required");
  if (!patch || typeof patch !== "object") throw new Error("patch is required");

  const sets = [];
  const params = [userId, id];
  let i = 2;

  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    const status = normalizeStatus(patch.status);
    if (!status) throw new Error("invalid status");
    params.push(status);
    sets.push(`status = $${++i}`);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "key_insight")) {
    const keyInsight =
      patch.key_insight === null ? null : String(patch.key_insight).trim() || null;
    params.push(keyInsight);
    sets.push(`key_insight = $${++i}`);
  }

  if (!sets.length) throw new Error("no supported patch fields");

  sets.push(`updated_at = NOW()`);

  const result = await db.query(
    `UPDATE learning_queue
     SET ${sets.join(", ")}
     WHERE user_id = $1 AND id = $2
     RETURNING *`,
    params
  );

  return result.rows[0] ?? null;
}

export async function deleteItem(db, userId, id) {
  if (!db) throw new Error("db is required");
  if (!userId) throw new Error("userId is required");
  if (!id) throw new Error("id is required");

  const result = await db.query(
    `DELETE FROM learning_queue
     WHERE user_id = $1 AND id = $2
     RETURNING *`,
    [userId, id]
  );

  return result.rows[0] ?? null;
}

function normalizeStatus(status) {
  if (typeof status !== "string") return null;
  const value = status.trim().toLowerCase();
  return value === "queued" || value === "reading" || value === "done" ? value : null;
}