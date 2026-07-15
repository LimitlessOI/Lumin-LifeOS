/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * SYNOPSIS: Exports getPendingAdam — services/pending-adam-service.js.
 */
export async function getPendingAdam(db, opts = {}) {
  const limitRaw = Number.isFinite(opts?.limit) ? Math.floor(opts.limit) : 50;
  const limit = Math.max(1, limitRaw);

  await ensurePendingAdamTable(db);

  const { rows } = await db.query(
    `
      SELECT id, title, type, priority, status, created_at
      FROM pending_adam
      WHERE status NOT IN ('resolved', 'dismissed')
      ORDER BY priority ASC, created_at ASC
      LIMIT $1
    `,
    [limit]
  );

  return rows;
}

export async function resolveAdamItem(db, id, resolvedBy) {
  await ensurePendingAdamTable(db);

  const { rows } = await db.query(
    `
      UPDATE pending_adam
      SET status = 'resolved',
          resolved_at = NOW(),
          resolved_by = $2
      WHERE id = $1
      RETURNING *
    `,
    [id, resolvedBy]
  );

  return rows[0] ?? null;
}

async function ensurePendingAdamTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS pending_adam (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const columns = [
    'project_id TEXT',
    'project_slug TEXT',
    'title TEXT',
    "type TEXT",
    'priority INTEGER',
    'context JSONB',
    'resolved_at TIMESTAMPTZ',
    'resolved_by TEXT',
    'resolved_notes TEXT',
    "is_resolved BOOLEAN NOT NULL DEFAULT FALSE",
    "status TEXT NOT NULL DEFAULT 'pending'",
  ];

  for (const col of columns) {
    const [name] = col.split(' ');
    await db.query(`ALTER TABLE pending_adam ADD COLUMN IF NOT EXISTS ${name} ${col.substring(name.length + 1)}`);
  }
}