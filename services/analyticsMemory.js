/**
 * SYNOPSIS: Publish analytics memory loop to creator_analytics table.
 * @ssot docs/products/creator-media-os/PRODUCT_HOME.md
 */
let analyticsData = []; // This should ideally be handled by a more persistent queue/DB, but keeping it for now to extend existing pattern.

async function publishAnalytics(deps, data) {
  const { pool, logger } = deps;
  if (!data || data.length === 0) {
    return;
  }

  // Assuming data is an array of objects, each representing a row for creator_analytics
  // This is a simplified bulk insert; a more robust solution might use unnest or a transaction.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of data) {
      await client.query(
        `INSERT INTO creator_analytics(creator_id, post_id, metric_date, views, likes, comments, shares, engagement_rate, reach, impressions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          item.creator_id,
          item.post_id,
          item.metric_date,
          item.views,
          item.likes,
          item.comments,
          item.shares,
          item.engagement_rate,
          item.reach,
          item.impressions,
        ]
      );
    }
    await client.query('COMMIT');
    logger.info({ count: data.length }, "Publish analytics memory loop: Successfully published analytics data.");
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error, data }, "Publish analytics memory loop: Error publishing analytics data.");
    throw new Error('Failed to publish analytics data to DB');
  } finally {
    client.release();
  }
}

function analyticsMemoryLoop(deps) {
  setInterval(async () => {
    if (analyticsData.length > 0) {
      const dataToPublish = [...analyticsData]; // Take a snapshot
      analyticsData = []; // Clear the local buffer immediately
      try {
        await publishAnalytics(deps, dataToPublish);
      } catch (error) {
        // Error already logged in publishAnalytics, just ensure the loop continues
        deps.logger.warn({ error }, "Publish analytics memory loop: Failed to process a batch, will retry next cycle if data is re-added.");
      }
    }
  }, 5000); // Adjust the interval as needed
}

export async function initializeAnalyticsMemory(deps, payload) {
  const { logger } = deps;
  logger.info("Publish analytics memory loop: Initializing analytics memory loop.");
  analyticsMemoryLoop(deps);
}

// Keeping this export as it might be used to add data to the buffer
export { analyticsData };