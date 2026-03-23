/**
 * DB Connection Pool Health Monitor
 * Tracks pool utilization and warns when approaching Neon connection limits.
 * Neon free tier: 100 connections max. Paid: varies.
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */
import logger from './logger.js';

const WARN_THRESHOLD = 0.7;  // warn at 70% pool usage
const CRIT_THRESHOLD = 0.9;  // critical at 90%

export function startDbHealthMonitor(pool, intervalMs = 60_000) {
  const check = () => {
    try {
      const { totalCount, idleCount, waitingCount } = pool;
      const maxConnections = pool.options?.max || 10;
      const activeCount = totalCount - idleCount;
      const utilization = totalCount / maxConnections;

      if (utilization >= CRIT_THRESHOLD) {
        logger.error('[DB-HEALTH] Pool near limit', {
          totalCount, idleCount, waitingCount, activeCount,
          maxConnections, utilizationPct: Math.round(utilization * 100),
        });
      } else if (utilization >= WARN_THRESHOLD) {
        logger.warn('[DB-HEALTH] Pool utilization high', {
          totalCount, idleCount, waitingCount,
          utilizationPct: Math.round(utilization * 100),
        });
      }

      if (waitingCount > 0) {
        logger.warn('[DB-HEALTH] Requests waiting for connection', { waitingCount });
      }
    } catch (err) {
      logger.warn('[DB-HEALTH] Monitor check failed', { error: err.message });
    }
  };

  const interval = setInterval(check, intervalMs);
  interval.unref(); // Don't prevent clean shutdown
  logger.info('[DB-HEALTH] Pool monitor started', { intervalMs });
  return interval;
}
