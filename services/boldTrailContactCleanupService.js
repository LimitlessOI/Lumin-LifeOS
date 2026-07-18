/**
 * SYNOPSIS: Service module — BoldTrailContactCleanupService.
 */
export default async function cleanupBoldTrailTestContacts(deps) {
  const { pool, logger } = deps ?? {};

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('deps.pool is required');
  }

  const testPatterns = [
    '%test%',
    '%sample%',
    '%demo%',
    '%dummy%',
    '%fake%',
    '%qa%',
    '%automation%',
    '%automated%',
    '%bot%',
    '%invalid%',
    '%noreply%',
    '%no-reply%',
  ];

  const whereClauses = [];
  const params = [];

  for (const pattern of testPatterns) {
    params.push(pattern);
    whereClauses.push(`LOWER(COALESCE(name, '')) LIKE $${params.length}`);
    params.push(pattern);
    whereClauses.push(`LOWER(COALESCE(email, '')) LIKE $${params.length}`);
    params.push(pattern);
    whereClauses.push(`LOWER(COALESCE(company, '')) LIKE $${params.length}`);
    params.push(pattern);
    whereClauses.push(`LOWER(COALESCE(phone, '')) LIKE $${params.length}`);
    params.push(pattern);
    whereClauses.push(`LOWER(COALESCE(tags::text, '')) LIKE $${params.length}`);
  }

  const sql = `
    DELETE FROM boldtrail_contacts
    WHERE ${whereClauses.join(' OR ')}
    RETURNING id, name, email, phone, company, tags, created_at, updated_at
  `;

  const result = await pool.query(sql, params);
  const deleted = result.rows ?? [];

  logger?.info?.('BoldTrail test contact cleanup completed', {
    deleted_count: deleted.length,
  });

  return {
    success: true,
    deleted_count: deleted.length,
    deleted_contacts: deleted,
  };
}