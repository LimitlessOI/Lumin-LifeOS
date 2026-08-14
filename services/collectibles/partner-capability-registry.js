/**
 * SYNOPSIS: Exports createPartnerCapabilityRegistry — services/collectibles/partner-capability-registry.js.
 * @typedef {object} PartnerCapabilityRegistry
 * @property {function(string): Promise<string[]>} getCapabilitiesForPartner - Retrieves capabilities for a given partner account ID.
 */

/**
 * Creates a partner capability registry service.
 *
 * This service manages and provides access to partner account capabilities,
 * which are defined in the {@link docs/products/collectibles/PRODUCT_HOME.md|Collectibles Product Home}.
 * Capabilities include various functionalities a partner can offer, such as
 * "bestRecommendation" or "sponsoredPlacement".
 *
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 *
 * @param {object} options - The options for creating the registry.
 * @param {object} options.pool - The database connection pool.
 * @returns {PartnerCapabilityRegistry} An object with methods to interact with partner capabilities.
 */
export function createPartnerCapabilityRegistry({ pool }) {
  /**
   * Retrieves the list of capabilities associated with a specific partner account ID.
   *
   * Capabilities are derived from the `partner_capabilities` table.
   * "sponsoredPlacement" is explicitly distinguished from "bestRecommendation"
   * as per product requirements.
   *
   * @param {string} partnerAccountId - The unique identifier for the partner account.
   * @returns {Promise<string[]>} A promise that resolves to an array of capability strings.
   *   Returns an empty array if no capabilities are found for the partner.
   */
  async function getCapabilitiesForPartner(partnerAccountId) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT capability_name
        FROM partner_capabilities
        WHERE partner_account_id = $1;
      `;
      const res = await client.query(query, [partnerAccountId]);
      return res.rows.map(row => row.capability_name);
    } finally {
      client.release();
    }
  }

  return {
    getCapabilitiesForPartner,
  };
}