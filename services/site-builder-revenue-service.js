/**
 * SYNOPSIS: Calculates the affiliate revenue forecast based on a given number of converted clients.
 */
import logger from './logger.js';

const AFFILIATE_COMMISSIONS = {
  JANE_APP: 50,
  MINDBODY: 200,
  SQUARE: 500, // Task specification overrides general domain context for this specific value
};

/**
 * Calculates the affiliate revenue forecast based on a given number of converted clients.
 * This function provides hypothetical potential revenue if all clients were referred to each specific partner,
 * and a total sum of these potentials.
 * @param {number} converted_count - The total number of converted clients.
 * @returns {{ jane_app: number, mindbody: number, square: number, total: number }}
 */
export function getAffiliateRevenueForecast(converted_count) {
  const jane_app = converted_count * AFFILIATE_COMMISSIONS.JANE_APP;
  const mindbody = converted_count * AFFILIATE_COMMISSIONS.MINDBODY;
  const square = converted_count * AFFILIATE_COMMISSIONS.SQUARE;
  const total = jane_app + mindbody + square; // Sum of potentials across all partners

  return {
    jane_app,
    mindbody,
    square,
    total,
  };
}

/**
 * Retrieves a summary of the Site Builder's revenue pipeline.
 * Includes discovered prospects, outreach sent, conversions, MRR,
 * total affiliate pipeline potential, and a list of top converted prospects.
 * Gracefully handles missing 'prospect_sites' table.
 * @param {object} pool - The PostgreSQL connection pool.
 * @returns {Promise<{ pipeline: { discovered: number, outreach_sent: number, converted: number }, mrr: number, affiliate_pipeline: number, top_prospects: Array<object> }>}
 */
export async function getSiteBuilderRevenueSummary(pool) {
  let discovered = 0;
  let outreach_sent = 0;
  let converted = 0;
  let mrr = 0;
  let top_prospects = [];

  try {
    // Count discovered prospects
    const discoveredResult = await pool.query(`SELECT COUNT(*) FROM prospect_sites`);
    discovered = parseInt(discoveredResult.rows[0].count, 10);

    // Count outreach sent
    const outreachSentResult = await pool.query(`SELECT COUNT(*) FROM prospect_sites WHERE email_sent = TRUE`);
    outreach_sent = parseInt(outreachSentResult.rows[0].count, 10);

    // Count converted prospects and calculate MRR
    const convertedResult = await pool.query(`
      SELECT
        COUNT(*) AS converted_count,
        COALESCE(SUM(CASE WHEN status = 'converted' THEN deal_value ELSE 0 END), 0) AS total_mrr
      FROM prospect_sites
      WHERE status = 'converted'
    `);
    converted = parseInt(convertedResult.rows[0].converted_count, 10);
    mrr = parseFloat(convertedResult.rows[0].total_mrr);

    // Get top converted prospects (e.g., 5 most recently converted)
    const topProspectsResult = await pool.query(`
      SELECT
        client_id,
        business_name,
        deal_value,
        pos_partner,
        status,
        updated_at
      FROM prospect_sites
      WHERE status = 'converted'
      ORDER BY updated_at DESC
      LIMIT 5
    `);
    top_prospects = topProspectsResult.rows;

  } catch (err) {
    // Gracefully handle missing table or other DB errors
    logger.warn('[REVENUE] Could not retrieve revenue summary (table may not exist or DB error)', { error: err.message });
    // Return default zero/empty values
    return {
      pipeline: { discovered: 0, outreach_sent: 0, converted: 0 },
      mrr: 0,
      affiliate_pipeline: 0,
      top_prospects: [],
    };
  }

  const affiliate_pipeline = getAffiliateRevenueForecast(converted).total;

  return {
    pipeline: {
      discovered,
      outreach_sent,
      converted,
    },
    mrr,
    affiliate_pipeline,
    top_prospects,
  };
}