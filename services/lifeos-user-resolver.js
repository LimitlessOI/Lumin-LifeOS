/**
 * services/lifeos-user-resolver.js
 *
 * Single source of truth for resolving a LifeOS user handle or id.
 *
 * Why this file exists:
 *   Every LifeOS route (16+ files) previously inlined its own resolveUserId()
 *   helper. The inline versions drifted and were mostly case-sensitive, which
 *   meant a URL like `?user=Adam` would return 404 even though POST /users
 *   lowercases the handle before insert. This module normalizes that lookup.
 *
 * Rules:
 *   - null/undefined/empty → null
 *   - pure numeric string → look up by id
 *   - otherwise → trim + lowercase + look up by user_handle (LifeOS always
 *     stores handles lowercase; see routes/lifeos-core-routes.js POST /users)
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const NUMERIC_RE = /^\d+$/;

/**
 * @param {import('pg').Pool} pool
 * @param {string|number|null|undefined} handleOrId
 * @returns {Promise<number|null>}
 */
export async function resolveLifeOSUserId(pool, handleOrId) {
  if (handleOrId == null) return null;
  const raw = String(handleOrId).trim();
  if (!raw) return null;

  if (NUMERIC_RE.test(raw)) {
    const { rows } = await pool.query(
      'SELECT id FROM lifeos_users WHERE id = $1 LIMIT 1',
      [parseInt(raw, 10)],
    );
    return rows[0]?.id ?? null;
  }

  const { rows } = await pool.query(
    'SELECT id FROM lifeos_users WHERE LOWER(user_handle) = $1 LIMIT 1',
    [raw.toLowerCase()],
  );
  return rows[0]?.id ?? null;
}

/**
 * Curried form: `const resolveUserId = makeLifeOSUserResolver(pool);`
 * Matches the signature previously inlined in every route.
 */
export function makeLifeOSUserResolver(pool) {
  return (handleOrId) => resolveLifeOSUserId(pool, handleOrId);
}
