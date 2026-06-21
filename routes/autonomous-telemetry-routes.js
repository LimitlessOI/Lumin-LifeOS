/**
 * SYNOPSIS: Autonomous telemetry + efficiency API routes.
 * Autonomous telemetry + efficiency API routes.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */

import express from 'express';
import {
  listAutonomousTelemetry,
  getSessionTelemetrySummary,
} from '../services/autonomous-telemetry-service.js';
import { computeEfficiencyIntelligence } from '../services/autonomous-efficiency-intelligence.js';
import { runGovernedTelemetrySession } from '../services/autonomous-telemetry-session.js';
import { computeAllBuilderOSMetrics } from '../services/builderos-metrics-reporter.js';

export function createAutonomousTelemetryRoutes({ requireKey, pool }) {
  const router = express.Router();

  router.get('/api/v1/lifeos/autonomous-telemetry/events', requireKey, async (req, res, next) => {
    try {
      const sessionId = req.query.session_id || null;
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const sinceHours = Math.min(parseInt(req.query.since_hours, 10) || 168, 720);
      const result = await listAutonomousTelemetry(pool, { sessionId, limit, sinceHours });
      if (!result.count) {
        return res.status(404).json({
          ok: false,
          status: 'NO_DATA',
          note: 'No telemetry events in window',
          read_path: 'GET /api/v1/lifeos/autonomous-telemetry/events',
        });
      }
      res.json({
        ok: true,
        events: result.events,
        count: result.count,
        token_note: 'token fields are estimates unless token_estimate_method=exact_usage',
        read_path: 'GET /api/v1/lifeos/autonomous-telemetry/events',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/autonomous-telemetry/efficiency', requireKey, async (req, res, next) => {
    try {
      const sessionId = req.query.session_id || null;
      const sinceHours = Math.min(parseInt(req.query.since_hours, 10) || 168, 720);
      const intel = await computeEfficiencyIntelligence(pool, { sessionId, sinceHours });
      if (!intel.ok) {
        return res.status(intel.status === 'NO_DATA' ? 404 : 503).json({
          ok: false,
          ...intel,
          read_path: 'GET /api/v1/lifeos/autonomous-telemetry/efficiency',
        });
      }
      res.json({
        ok: true,
        ...intel,
        read_path: 'GET /api/v1/lifeos/autonomous-telemetry/efficiency',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/autonomous-telemetry/session/:sessionId/summary', requireKey, async (req, res, next) => {
    try {
      const summary = await getSessionTelemetrySummary(pool, req.params.sessionId);
      if (!summary.ok || !summary.event_count) {
        return res.status(404).json({
          ok: false,
          status: 'NO_DATA',
          session_id: req.params.sessionId,
          read_path: 'GET /api/v1/lifeos/autonomous-telemetry/session/:sessionId/summary',
        });
      }
      const efficiency = await computeEfficiencyIntelligence(pool, {
        sessionId: req.params.sessionId,
        sinceHours: 720,
      });
      res.json({
        ok: true,
        summary,
        efficiency: efficiency.ok ? efficiency : { status: efficiency.status || 'NO_DATA' },
        read_path: 'GET /api/v1/lifeos/autonomous-telemetry/session/:sessionId/summary',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/autonomous-telemetry/metrics', requireKey, async (req, res, next) => {
    try {
      const sinceHours = Math.min(parseInt(req.query.since_hours, 10) || 168, 720);
      const metrics = await computeAllBuilderOSMetrics(pool, { sinceHours });
      res.json({
        ok: true,
        since_hours: sinceHours,
        metrics,
        read_path: 'GET /api/v1/lifeos/autonomous-telemetry/metrics',
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/lifeos/autonomous-telemetry/session/run', requireKey, async (req, res, next) => {
    try {
      const maxCycles = Math.min(parseInt(req.body?.max_cycles, 10) || 5, 10);
      const maxMinutes = Math.min(parseInt(req.body?.max_minutes, 10) || 45, 60);
      const triggeredBy = req.body?.triggered_by || 'CC-telemetry-session';
      const outcome = await runGovernedTelemetrySession(pool, { maxCycles, maxMinutes, triggeredBy });
      const status = outcome.halted ? 409 : outcome.ok ? 200 : 422;
      res.status(status).json({
        ...outcome,
        read_path: 'POST /api/v1/lifeos/autonomous-telemetry/session/run',
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
