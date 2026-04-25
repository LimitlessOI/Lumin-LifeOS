/**
 * Horizon + Red-team intel API (Amendment 36).
 * Mounted at /api/v1/lifeos/intel
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import express from 'express';
import { createLaneIntelService } from '../services/lane-intel-service.js';

const LANES = new Set(['horizon', 'redteam']);

/** Horizon / Red-team runs cost API + web search + council tokens — off until Adam enables (post-launch / budget). */
function requireLaneIntelEnabled(req, res, next) {
  if (process.env.LANE_INTEL_ENABLED !== '1') {
    return res.status(403).json({
      ok: false,
      error:
        'Lane intel execution is disabled (budget/launch gate). No Horizon or Red-team scans will run until LANE_INTEL_ENABLED=1 is set in Railway.',
      code: 'LANE_INTEL_DISABLED',
    });
  }
  next();
}

export function createLaneIntelRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = express.Router();
  const log = logger || console;
  const intel = createLaneIntelService({ pool, logger, callCouncilMember });

  router.get('/horizon/latest', requireKey, async (req, res) => {
    try {
      const limit = req.query.limit;
      const rows = await intel.listLatest('horizon', limit);
      res.json({ ok: true, lane: 'horizon', findings: rows });
    } catch (err) {
      log.error({ err: err.message }, '[LANE-INTEL] horizon/latest');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/redteam/latest', requireKey, async (req, res) => {
    try {
      const limit = req.query.limit;
      const rows = await intel.listLatest('redteam', limit);
      res.json({ ok: true, lane: 'redteam', findings: rows });
    } catch (err) {
      log.error({ err: err.message }, '[LANE-INTEL] redteam/latest');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/runs', requireKey, async (req, res) => {
    try {
      const lane = String(req.query.lane || 'horizon');
      if (!LANES.has(lane)) {
        return res.status(400).json({ ok: false, error: 'lane must be horizon or redteam' });
      }
      const rows = await intel.listRuns(lane, req.query.limit);
      res.json({ ok: true, lane, runs: rows });
    } catch (err) {
      log.error({ err: err.message }, '[LANE-INTEL] runs');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/horizon/run', requireKey, requireLaneIntelEnabled, async (req, res) => {
    try {
      const out = await intel.runHorizonScan();
      res.json({ ok: true, ...out });
    } catch (err) {
      log.error({ err: err.message }, '[LANE-INTEL] horizon/run');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/redteam/run', requireKey, requireLaneIntelEnabled, async (req, res) => {
    try {
      const out = await intel.runRedTeamScan();
      res.json({ ok: true, ...out });
    } catch (err) {
      log.error({ err: err.message }, '[LANE-INTEL] redteam/run');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
