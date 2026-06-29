/**
 * SYNOPSIS: Self-Repair Memory Routes
 * Self-Repair Memory Routes
 *
 * Read-only runtime diagnostics for repair-memory state.
 *
 * @ssot docs/architecture/MEMORY_AUTHORITY_MAP.md
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */

import { Router } from 'express';
import { readLatestRepairMemory } from '../services/self-repair-memory.js';

export function createMemorySelfRepairRoutes({ pool, requireKey }) {
  const router = Router();

  router.get('/health', requireKey, async (_req, res) => {
    try {
      const [counts, latest] = await Promise.all([
        pool.query(`
          SELECT COUNT(*)::int AS total_memory_events,
                 COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS memory_event_count_24h
          FROM self_repair_memory_events
        `),
        readLatestRepairMemory(pool, 1),
      ]);

      const total = counts.rows[0]?.total_memory_events || 0;
      const recent = counts.rows[0]?.memory_event_count_24h || 0;
      const latestLesson = latest.lessons?.[0] || null;

      res.json({
        ok: true,
        proof_status: total > 0 ? 'LIVE' : 'NO_DATA',
        proof_source: 'self_repair_memory_events',
        total_memory_events: total,
        memory_event_count_24h: recent,
        latest_memory_event: latestLesson,
        queried_at: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        proof_status: 'ERROR',
        proof_source: 'self_repair_memory_events',
        error_detail: error.message,
        queried_at: new Date().toISOString(),
      });
    }
  });

  router.get('/latest', requireKey, async (_req, res) => {
    try {
      const latest = await readLatestRepairMemory(pool, 10);
      res.json(latest);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}
