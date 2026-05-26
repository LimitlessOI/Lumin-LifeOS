/**
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */
import { Router } from 'express';

const createMemoryStatusRoutes = ({ pool, requireKey }) => {
  const router = Router();

  router.get('/api/v1/lifeos/command-center/memory/status', requireKey, async (req, res) => {
    try {
      const totalRowCount = await pool.query('SELECT COUNT(*) FROM self_repair_memory_events');
      const latestEvent = await pool.query('SELECT id, created_at, trigger, result, lesson_learned, triggered_by FROM self_repair_memory_events ORDER BY created_at DESC LIMIT 1');
      const twentyFourHourCount = await pool.query("SELECT COUNT(*) FROM self_repair_memory_events WHERE created_at > NOW() - INTERVAL '24 hours'");

      const totalMemoryEvents = parseInt(totalRowCount.rows[0].count, 10);
      const latestMemoryEvent = latestEvent.rows[0] || null;
      const latestMemoryTimestamp = latestMemoryEvent ? latestMemoryEvent.created_at : null;
      const memoryEventCount24h = parseInt(twentyFourHourCount.rows[0].count, 10);

      const proofStatus = totalMemoryEvents > 0 ? 'LIVE' : 'NO_DATA';
      const runtimeVerdict = totalMemoryEvents > 0 ? 'MEMORY_LIVE_DB_QUERYABLE' : 'MEMORY_NO_DATA_YET';
      const memoryEnabled = true;

      res.json({
        ok: true,
        memory_enabled: memoryEnabled,
        total_memory_events: totalMemoryEvents,
        latest_memory_event: latestMemoryEvent,
        latest_memory_timestamp: latestMemoryTimestamp,
        memory_event_count_24h: memoryEventCount24h,
        proof_status: proofStatus,
        proof_source: 'self_repair_memory_events',
        runtime_verdict: runtimeVerdict,
        queried_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        ok: false,
        memory_enabled: false,
        proof_status: 'ERROR',
        proof_source: 'self_repair_memory_events',
        runtime_verdict: 'MEMORY_ERROR',
        queried_at: new Date().toISOString(),
      });
    }
  });

  return router;
};

export default createMemoryStatusRoutes;