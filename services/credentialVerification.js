/**
 * SYNOPSIS: Exports verifyCredential — services/credentialVerification.js.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */

/**
 * Verifies a credential and returns the verification result.
 *
 * @param {object} deps - Injected dependencies.
 * @param {import('pg').Pool} deps.pool - The PostgreSQL connection pool.
 * @param {object} payload - The payload containing credential information.
 * @param {string} payload.credentialId - The ID of the credential to verify.
 * @returns {Promise<object | null>} The verification result or null if not found.
 */
export async function verifyCredential(deps, payload) {
  const { pool } = deps;
  const { credentialId } = payload;

  const sql = `
    SELECT
      id,
      credential_id,
      provider,
      verification_status,
      verification_details,
      last_verified_at,
      created_at,
      updated_at
    FROM
      credential_verification_results
    WHERE
      credential_id = $1;
  `;

  try {
    const result = await pool.query(sql, [credentialId]);
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (error) {
    deps.logger.error({ error, credentialId }, 'Error verifying credential');
    throw new Error('Failed to verify credential');
  }
}