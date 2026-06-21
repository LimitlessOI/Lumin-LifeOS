/**
 * SYNOPSIS: HTTP route module — Memory Status Routes.
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */
import { Router } from 'express';

const createMemoryStatusRoutes = ({ pool, requireKey }) => {
  const router = Router();

  router.get('/api/v1/lifeos/command-center/memory/status', requireKey, async (req, res) => {
    try {
      const [
        factCounts,
        latestFact,
        domainCount,
        repairCounts,
        latestRepairEvent,
      ] = await Promise.all([
        pool.query(`
          SELECT COUNT(*)::int AS total_facts,
                 COUNT(*) FILTER (WHERE level >= 2 AND source_count > 1)::int AS proven_facts
          FROM epistemic_facts
        `),
        pool.query(`
          SELECT id, text, domain, level, source_count, created_at
          FROM epistemic_facts
          ORDER BY created_at DESC
          LIMIT 1
        `),
        pool.query('SELECT COUNT(DISTINCT domain)::int AS distinct_domains FROM epistemic_facts'),
        pool.query(`
          SELECT COUNT(*)::int AS total_memory_events,
                 COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS memory_event_count_24h
          FROM self_repair_memory_events
        `),
        pool.query(`
          SELECT id, created_at, trigger, result, lesson_learned, triggered_by
          FROM self_repair_memory_events
          ORDER BY created_at DESC
          LIMIT 1
        `),
      ]);

      const totalFacts = factCounts.rows[0].total_facts;
      const provenFacts = factCounts.rows[0].proven_facts;
      const distinctDomains = domainCount.rows[0].distinct_domains;
      const latestFactRow = latestFact.rows[0] || null;
      const totalMemoryEvents = repairCounts.rows[0].total_memory_events;
      const memoryEventCount24h = repairCounts.rows[0].memory_event_count_24h;
      const latestMemoryEvent = latestRepairEvent.rows[0] || null;
      const latestMemoryTimestamp = latestFactRow?.created_at || latestMemoryEvent?.created_at || null;

      const proofStatus = provenFacts > 0
        ? (distinctDomains >= 5 ? 'ACTIVE' : 'PROVEN')
        : (totalFacts > 0 ? 'LIVE' : 'WIRED');
      const runtimeVerdict = provenFacts > 0
        ? 'MEMORY_PROVEN_EPISTEMIC_FACTS'
        : (totalFacts > 0 ? 'MEMORY_LIVE_EPISTEMIC_FACTS' : 'MEMORY_NO_PROVEN_FACTS_YET');
      const memoryEnabled = true;

      res.json({
        ok: true,
        memory_enabled: memoryEnabled,
        total_facts: totalFacts,
        proven_facts: provenFacts,
        distinct_domains: distinctDomains,
        latest_fact: latestFactRow,
        total_memory_events: totalMemoryEvents,
        latest_memory_event: latestMemoryEvent,
        latest_memory_timestamp: latestMemoryTimestamp,
        memory_event_count_24h: memoryEventCount24h,
        proof_status: proofStatus,
        proof_source: 'epistemic_facts',
        supplementary_proof_source: 'self_repair_memory_events',
        runtime_verdict: runtimeVerdict,
        queried_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[memory-status]', error);
      res.status(500).json({
        ok: false,
        memory_enabled: false,
        proof_status: 'ERROR',
        proof_source: 'epistemic_facts',
        supplementary_proof_source: 'self_repair_memory_events',
        runtime_verdict: 'MEMORY_ERROR',
        error_detail: error.message,
        queried_at: new Date().toISOString(),
      });
    }
  });

  return router;
};

export default createMemoryStatusRoutes;
