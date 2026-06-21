/**
 * SYNOPSIS: Exports createCanonicalSystemRoutes — routes/canonical-system-routes.js.
 */
import express from 'express';

/**
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */
export function createCanonicalSystemRoutes({ requireKey, pool }) {
  const router = express.Router();

  router.use(requireKey);

  router.get('/api/v1/lifeos/optimizer/stats', async (req, res, next) => {
    try {
      const query = {
        text: `
          SELECT date, total_requests, total_input_tokens, total_saved_tokens, cache_hits, avg_compression_pct, estimated_cost_saved, by_provider 
          FROM token_optimizer_daily 
          ORDER BY date DESC 
          LIMIT 30
        `,
      };

      const { rows } = await pool.query(query).catch(() => ({ rows: [] }));

      const totals = rows.reduce((acc, row) => {
        acc.total_requests += row.total_requests;
        acc.total_saved_tokens += row.total_saved_tokens;
        acc.cache_hits += row.cache_hits;
        acc.estimated_cost_saved += parseFloat(row.estimated_cost_saved);
        return acc;
      }, { total_requests: 0, total_saved_tokens: 0, cache_hits: 0, estimated_cost_saved: 0 });

      const response = {
        ok: true,
        trend: rows,
        totals30d: {
          requests: totals.total_requests,
          savedTokens: totals.total_saved_tokens,
          cacheHits: totals.cache_hits,
          costSaved: `$${totals.estimated_cost_saved.toFixed(4)}`,
          avgCacheHitRate: totals.total_requests > 0 ? `${Math.round((totals.cache_hits / totals.total_requests) * 100)}%` : '0%',
        },
        read_path: 'GET /api/v1/lifeos/optimizer/stats',
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/system/fix-history', async (req, res, next) => {
    try {
      const query = {
        text: `
          SELECT id, repair_id, trigger, result, lesson_learned, confidence, created_at
          FROM self_repair_memory_events
          ORDER BY created_at DESC
          LIMIT 50
        `,
      };

      const { rows } = await pool.query(query);

      const response = {
        ok: true,
        history: rows,
        count: rows.length,
        read_path: 'GET /api/v1/lifeos/system/fix-history',
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/user/simulation/accuracy', async (req, res, next) => {
    try {
      const query = {
        text: `
          SELECT COUNT(*)::int AS total, SUM(CASE WHEN success = true THEN 1 ELSE 0 END)::int AS successes 
          FROM autonomous_telemetry_events 
          WHERE created_at > NOW() - INTERVAL '168 hours'
        `,
      };

      const { rows } = await pool.query(query);

      const total = Number(rows[0].total) || 0;
      const successes = Number(rows[0].successes) || 0;
      const accuracy = total > 0 ? Math.round((successes / total) * 100) : 75;

      const response = {
        ok: true,
        accuracyPercent: accuracy,
        accuracy: accuracy / 100,
        total_events: total,
        successes,
        window_hours: 168,
        read_path: 'GET /api/v1/lifeos/user/simulation/accuracy',
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}