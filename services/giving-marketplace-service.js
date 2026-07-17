/**
 * SYNOPSIS: Service module — Giving Marketplace Service.
 * @ssot docs/products/giving-marketplace/PRODUCT_HOME.md
 */


const createGivingMarketplaceService = ({ pool }) => {
  return {
    async createDonation(donation) {
      const { donorId, item, description, quantity } = donation;
      const query = `
        INSERT INTO donations (donor_id, item, description, quantity)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const values = [donorId, item, description, quantity];
      const result = await pool.query(query, values);
      return result.rows[0];
    },

    async listAvailableDonations(filters) {
      const { category, location } = filters;
      const query = `
        SELECT * FROM donations
        WHERE category = $1 AND location = $2 AND claimed = FALSE;
      `;
      const values = [category, location];
      const result = await pool.query(query, values);
      return result.rows;
    },

    async searchDonations(query) {
      const searchQuery = `
        SELECT * FROM donations
        WHERE item ILIKE $1 OR description ILIKE $1;
      `;
      const values = [`%${query}%`];
      const result = await pool.query(searchQuery, values);
      return result.rows;
    },

    async claimDonation(donationId, claimer) {
      const query = `
        UPDATE donations
        SET claimed = TRUE, claimer_id = $1
        WHERE donation_id = $2 AND claimed = FALSE
        RETURNING *;
      `;
      const values = [claimer, donationId];
      const result = await pool.query(query, values);
      return result.rows[0];
    },

    async markHandedOff(donationId, donorId) {
      const query = `
        UPDATE donations
        SET handed_off = TRUE
        WHERE donation_id = $1 AND donor_id = $2
        RETURNING *;
      `;
      const values = [donationId, donorId];
      const result = await pool.query(query, values);
      return result.rows[0];
    },

    async getDonation(donationId) {
      const query = `
        SELECT * FROM donations
        WHERE donation_id = $1;
      `;
      const values = [donationId];
      const result = await pool.query(query, values);
      return result.rows[0];
    },

    async listMyDonations(userId) {
      const query = `
        SELECT * FROM donations
        WHERE donor_id = $1;
      `;
      const values = [userId];
      const result = await pool.query(query, values);
      return result.rows;
    }
  };
};

export { createGivingMarketplaceService };
