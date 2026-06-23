/**
 * SYNOPSIS: Resolve LifeRE string user keys to lifeos_users.id for Am 08 outreach tables.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */

export async function resolveLifeOSUserId(pool, userKey = 'adam') {
  if (!pool) return null;
  const key = String(userKey || '').trim();
  if (!key) return null;
  if (/^\d+$/.test(key)) return Number(key);

  const { rows } = await pool.query(
    `SELECT id FROM lifeos_users
     WHERE user_handle = $1 OR LOWER(display_name) = LOWER($1)
     LIMIT 1`,
    [key],
  );
  return rows[0]?.id ?? null;
}
