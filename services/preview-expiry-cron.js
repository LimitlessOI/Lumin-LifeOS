/**
 * Preview Site Expiry Cron
 * Deletes preview sites older than 30 days where status != 'converted'
 * Amendment 05 non-negotiable: "Preview sites expire after 30 days unless client converts"
 */
import { promises as fs } from 'fs';
import path from 'path';
import logger from './logger.js';

export async function runPreviewExpiry(pool, previewsDir = 'public/previews') {
  logger.info('[EXPIRY] Running preview site expiry check');

  try {
    // Find expired prospects (>30 days, not converted)
    const result = await pool.query(`
      SELECT client_id, preview_url, business_name
      FROM prospect_sites
      WHERE created_at < NOW() - INTERVAL '30 days'
        AND status != 'converted'
        AND status != 'expired'
    `);

    if (result.rows.length === 0) {
      logger.info('[EXPIRY] No expired previews found');
      return { expired: 0 };
    }

    let expired = 0;
    for (const row of result.rows) {
      const clientDir = path.join(previewsDir, row.client_id);
      try {
        await fs.rm(clientDir, { recursive: true, force: true });
        await pool.query(
          `UPDATE prospect_sites SET status = 'expired', updated_at = NOW() WHERE client_id = $1`,
          [row.client_id]
        );
        expired++;
        logger.info('[EXPIRY] Deleted expired preview', { clientId: row.client_id, businessName: row.business_name });
      } catch (err) {
        logger.warn('[EXPIRY] Failed to delete preview dir', { clientId: row.client_id, error: err.message });
      }
    }

    logger.info('[EXPIRY] Expiry run complete', { expired });
    return { expired };
  } catch (err) {
    logger.error('[EXPIRY] Expiry cron failed', { error: err.message });
    return { expired: 0, error: err.message };
  }
}
