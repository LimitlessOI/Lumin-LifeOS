/**
 * SYNOPSIS: Exports addItem — services/lifeos-learning.js.
 */
export async function addItem(db, userId, data) {
  if (!db || typeof db.query !== "function") {
    throw new Error("A db client with query() is required");
  }

  const title = typeof data?.title === "string" ? data.title.trim() : "";
  if (!title) {
    throw new Error("title is required");
  }

  const type = typeof data?.type === "string" && data.type.trim() ? data.type.trim() : null;
  const url = typeof data?.url === "string" && data.url.trim() ? data.url.trim() : null;
  const status = normalizeStatus(data?.status) ?? "queued";
  const keyInsight = typeof data?.key_insight === "string" && data.key_insight.trim() ? data.key_insight.trim() : null;

  const { rows } = await db.query(
    `insert into learning_queue (user_id, title, type, url, status, key_insight)
     values ($1, $2, $3, $4, $5, $6)
     returning *`,
    [userId, title, type, url, status, keyInsight]
  );

  return rows[0] ?? null;
}

export async function listItems(db, userId, { status } = {}) {
  if (!db || typeof db.query !== "function") {
    throw new Error("A db client with query() is required");
  }

  const params = [userId];
  let sql = `select * from learning_queue where user_id = $1`;

  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus) {
    params.push(normalizedStatus);
    sql += ` and status = $2`;
  }

  sql += ` order by created_at desc, id desc`;

  const { rows } = await db.query(sql, params);
  return rows;
}

export async function updateItem(db, userId, id, patch) {
  if (!db || typeof db.query !== "function") {
    throw new Error("A db client with query() is required");
  }

  const fields = [];
  const values = [];
  let idx = 1;

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, "status")) {
    const status = normalizeStatus(patch.status);
    if (!status) {
      throw new Error("status must be queued, reading, or done");
    }
    fields.push(`status = $${idx++}`);
    values.push(status);
  }

  if (Object.prototype.hasOwnProperty.call(patch ?? {}, "key_insight")) {
    const keyInsight =
      typeof patch.key_insight === "string" && patch.key_insight.trim()
        ? patch.key_insight.trim()
        : null;
    fields.push(`key_insight = $${idx++}`);
    values.push(keyInsight);
  }

  if (fields.length === 0) {
    throw new Error("No supported patch fields provided");
  }

  fields.push(`updated_at = now()`);
  values.push(userId, id);

  const { rows } = await db.query(
    `update learning_queue
     set ${fields.join(", ")}
     where user_id = $${idx++} and id = $${idx}
     returning *`,
    values
  );

  return rows[0] ?? null;
}

export async function deleteItem(db, userId, id) {
  if (!db || typeof db.query !== "function") {
    throw new Error("A db client with query() is required");
  }

  const { rows } = await db.query(
    `delete from learning_queue
     where user_id = $1 and id = $2
     returning *`,
    [userId, id]
  );

  return rows[0] ?? null;
}

function normalizeStatus(value) {
  if (typeof value !== "string") return null;
  const status = value.trim().toLowerCase();
  return status === "queued" || status === "reading" || status === "done" ? status : null;
}

ASSUMPTIONS