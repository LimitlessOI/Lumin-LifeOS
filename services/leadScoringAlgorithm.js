/**
 * SYNOPSIS: Implements scoring rubric for leads based on various criteria.
 * @ssot docs/products/boldtrail/PRODUCT_HOME.md
 */
export async function calculateLeadScore(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};

  try {
    // Fetch lead data from the database
    const { rows } = await pool.query('SELECT * FROM boldtrail_leads WHERE id = $1', [id]);
    const lead = rows[0];

    if (!lead) {
      return null;
    }

    let score = 0;

    // Scoring rubric:
    // This rubric assigns points based on various lead attributes to determine a lead's overall score.
    // The higher the score, the more qualified the lead is considered.

    // 1. Lead Status: Higher points for more engaged statuses
    //    - 'new': +5 points
    //    - 'contacted': +10 points
    //    - 'interested': +20 points
    //    - 'showing_scheduled': +30 points
    //    - 'offer_made': +40 points
    if (lead.status === 'new') {
      score += 5;
    } else if (lead.status === 'contacted') {
      score += 10;
    } else if (lead.status === 'interested') {
      score += 20;
    } else if (lead.status === 'showing_scheduled') {
      score += 30;
    } else if (lead.status === 'offer_made') {
      score += 40;
    }

    // 2. Data Completeness: Points for having essential data
    //    - +5 points if 'email' is present in lead.data
    //    - +5 points if 'phone' is present in lead.data
    if (lead.data && lead.data.email) {
      score += 5;
    }
    if (lead.data && lead.data.phone) {
      score += 5;
    }

    // 3. Custom Criteria (example - assuming 'budget' and 'property_type' might be in lead.data)
    //    - Budget: +10 points if budget > $300,000
    //    - Property Type: +5 points if 'single_family'
    if (lead.data && typeof lead.data.budget === 'number' && lead.data.budget > 300000) {
      score += 10;
    }
    if (lead.data && lead.data.property_type === 'single_family') {
      score += 5;
    }

    return { ...lead, score };
  } catch (error) {
    logger.error({ error }, 'Error in calculateLeadScore');
    throw new Error('Failed in calculateLeadScore');
  }
}