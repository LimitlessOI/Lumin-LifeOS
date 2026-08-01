/**
 * SYNOPSIS: Ingests social post performance data into the marketing_performance_analytics table.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
export async function ingestPerformanceData(deps, payload) {
  const { pool, logger } = deps;
  const {
    postId,
    platform,
    impressions,
    clicks,
    likes,
    comments,
    shares,
    reach,
    engagementRate,
    recordedAt
  } = payload || {};

  if (!postId || !platform || !recordedAt) {
    logger.warn({ payload }, 'Missing required fields for performance data ingestion');
    throw new Error('Missing required fields: postId, platform, recordedAt');
  }

  try {
    const sql = `
      INSERT INTO marketing_performance_analytics (
        post_id,
        platform,
        impressions,
        clicks,
        likes,
        comments,
        shares,
        reach,
        engagement_rate,
        recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, created_at;
    `;
    const values = [
      postId,
      platform,
      impressions,
      clicks,
      likes,
      comments,
      shares,
      reach,
      engagementRate,
      recordedAt
    ];

    const { rows } = await pool.query(sql, values);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, payload }, 'Error in ingestPerformanceData');
    throw new Error('Failed to ingest performance data');
  }
}