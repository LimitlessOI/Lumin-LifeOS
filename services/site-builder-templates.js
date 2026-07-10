/**
 * SYNOPSIS: Exports listTemplates — services/site-builder-templates.js.
 */
export async function listTemplates(db) {
  const client = db?.query ? db : null;
  if (!client) {
    throw new TypeError("db must provide a query function");
  }

  const { rows } = await client.query(
    "SELECT id, name, thumbnail_url, config, sort_order, created_at, updated_at FROM site_builder_templates ORDER BY sort_order ASC"
  );

  return rows;
}

export async function getTemplate(db, id) {
  const client = db?.query ? db : null;
  if (!client) {
    throw new TypeError("db must provide a query function");
  }

  const { rows } = await client.query(
    "SELECT id, name, thumbnail_url, config, sort_order, created_at, updated_at FROM site_builder_templates WHERE id = $1 LIMIT 1",
    [id]
  );

  return rows[0] ?? null;
}