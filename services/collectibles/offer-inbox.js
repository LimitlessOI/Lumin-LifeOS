/**
 * SYNOPSIS: Exports createOfferInboxService — services/collectibles/offer-inbox.js.
 * @typedef {Object} OfferInboxService
 * @property {Function} getOffers - Retrieves offers for a given user.
 * @property {Function} acceptOffer - Marks an offer as accepted.
 * @property {Function} declineOffer - Marks an offer as declined.
 * @property {Function} createOffer - Creates a new offer.
 */

/**
 * @typedef {Object} Offer
 * @property {string} id
 * @property {string} collectibleId
 * @property {string} offerorId
 * @property {string} recipientId
 * @property {number} standingOfferScore - Score indicating the offeror's standing (e.g., historical reliability).
 * @property {number} qualityScore - Score indicating the perceived quality or desirability of the offer.
 * @property {string} status - 'pending', 'accepted', 'declined', 'spam'
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * Creates an offer inbox service.
 *
 * This service manages offers for collectibles, incorporating standing offers, quality scores,
 * and basic spam controls. It does not handle payments directly but facilitates the offer lifecycle.
 *
 * @param {Object} dependencies
 * @param {import('pg').Pool} dependencies.pool - The PostgreSQL connection pool.
 * @returns {OfferInboxService}
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */
export function createOfferInboxService({ pool }) {
  /**
   * Retrieves offers for a given user, optionally filtering by status.
   * @param {string} userId - The ID of the recipient user.
   * @param {string} [status] - Optional status to filter offers by (e.g., 'pending', 'accepted').
   * @returns {Promise<Offer[]>} A list of offers.
   */
  const getOffers = async (userId, status = 'pending') => {
    let query = `
      SELECT id, "collectibleId", "offerorId", "recipientId", "standingOfferScore", "qualityScore", status, "createdAt", "updatedAt"
      FROM offers
      WHERE "recipientId" = $1 AND status = $2
      ORDER BY "createdAt" DESC;
    `;
    const { rows } = await pool.query(query, [userId, status]);
    return rows;
  };

  /**
   * Marks an offer as accepted.
   * @param {string} offerId - The ID of the offer to accept.
   * @param {string} userId - The ID of the user accepting the offer (must be the recipient).
   * @returns {Promise<boolean>} True if the offer was accepted, false otherwise.
   */
  const acceptOffer = async (offerId, userId) => {
    const { rowCount } = await pool.query(
      `
      UPDATE offers
      SET status = 'accepted', "updatedAt" = NOW()
      WHERE id = $1 AND "recipientId" = $2 AND status = 'pending';
      `,
      [offerId, userId]
    );
    return rowCount > 0;
  };

  /**
   * Marks an offer as declined.
   * @param {string} offerId - The ID of the offer to decline.
   * @param {string} userId - The ID of the user declining the offer (must be the recipient).
   * @returns {Promise<boolean>} True if the offer was declined, false otherwise.
   */
  const declineOffer = async (offerId, userId) => {
    const { rowCount } = await pool.query(
      `
      UPDATE offers
      SET status = 'declined', "updatedAt" = NOW()
      WHERE id = $1 AND "recipientId" = $2 AND status = 'pending';
      `,
      [offerId, userId]
    );
    return rowCount > 0;
  };

  /**
   * Creates a new offer.
   *
   * @param {string} collectibleId - The ID of the collectible being offered on.
   * @param {string} offerorId - The ID of the user making the offer.
   * @param {string} recipientId - The ID of the user who owns the collectible.
   * @param {number} standingOfferScore - A score reflecting the offeror's standing.
   * @param {number} qualityScore - A score reflecting the offer's quality/desirability.
   * @returns {Promise<Offer>} The created offer.
   */
  const createOffer = async (collectibleId, offerorId, recipientId, standingOfferScore, qualityScore) => {
    // Basic spam control: prevent multiple pending offers from the same offeror for the same collectible to the same recipient
    const existingOffers = await pool.query(
      `SELECT id FROM offers WHERE "collectibleId" = $1 AND "offerorId" = $2 AND "recipientId" = $3 AND status = 'pending'`,
      [collectibleId, offerorId, recipientId]
    );

    if (existingOffers.rowCount > 0) {
      // For this minimal matching engine, we'll just prevent duplicates.
      // A more advanced system might update the existing offer or apply a different strategy.
      throw new Error('An active offer already exists for this collectible from this offeror.');
    }

    const { rows } = await pool.query(
      `
      INSERT INTO offers ("collectibleId", "offerorId", "recipientId", "standingOfferScore", "qualityScore", status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
      RETURNING id, "collectibleId", "offerorId", "recipientId", "standingOfferScore", "qualityScore", status, "createdAt", "updatedAt";
      `,
      [collectibleId, offerorId, recipientId, standingOfferScore, qualityScore]
    );
    return rows[0];
  };

  return {
    getOffers,
    acceptOffer,
    declineOffer,
    createOffer,
  };
}
