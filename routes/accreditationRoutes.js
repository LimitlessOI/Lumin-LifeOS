/**
 * SYNOPSIS: Exports registerAccreditationRoutes — routes/accreditationRoutes.js.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */

/**
 * Registers accreditation routes to the Express app.
 *
 * @param {object} app - The Express app instance.
 * @param {object} deps - Injected dependencies.
 * @param {import('pg').Pool} deps.pool - The PostgreSQL connection pool.
 * @param {function} deps.requireKey - The Express middleware enforcing the command key.
 * @param {object} deps.logger - The structured logger.
 * @param {string} deps.baseUrl - The public base URL string of the running deploy.
 * @param {function} deps.callCouncilMember - The async AI hook.
 */
export function registerAccreditationRoutes(app, deps) {
  /**
   * Validates the credential using the verifyCredential service function.
   *
   * @param {object} req - The Express request object.
   * @param {object} res - The Express response object.
   * @param {function} next - The Express next middleware function.
   */
  app.get('/api/v1/accreditation/structure', deps.requireKey, async (req, res, next) => {
    try {
      const { credentialId } = req.body;
      const result = await verifyCredential(deps, { credentialId });
      res.json(result);
    } catch (error) {
      deps.logger.error({ error, credentialId }, 'Error in credential verification route');
      next(error);
    }
  });

  /**
   * Verifies a credential and returns the verification result.
   *
   * @param {object} deps - Injected dependencies.
   * @param {object} payload - The payload containing credential information.
   * @param {string} payload.credentialId - The ID of the credential to verify.
   * @returns {Promise<object | null>} The verification result or null if not found.
   */
  async function verifyCredential(deps, payload) {
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
}