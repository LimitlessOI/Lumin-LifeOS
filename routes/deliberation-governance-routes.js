/**
 * SYNOPSIS: Deliberation governance API — v2.7 CnclRoster, scorecard, Hist, CFO, gate, consensus.
 * Deliberation governance API — v2.7 CnclRoster, scorecard, Hist, CFO, gate, consensus.
 *
 * Base: /api/v1/lifeos/deliberation
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { Router } from 'express';
import { createDeliberationGovernanceService } from '../services/deliberation-governance-service.js';
import { VALID_AUTHORITIES, VALID_REP_CATALOG } from '../config/deliberation-governance.js';

function respondDeliberationError(res, log, context, err) {
  if (err?.code === '23505') {
    return res.status(409).json({ ok: false, error: 'session_id already exists' });
  }
  log.error(`[DELIBERATION] ${context}`, err);
  return res.status(500).json({ ok: false, error: 'Internal error' });
}

export function createDeliberationGovernanceRoutes({ pool, requireKey, logger }) {
  const router = Router();
  const log = logger || console;

  if (!pool?.query) {
    router.use((_req, res) =>
      res.status(503).json({ ok: false, error: 'Database pool unavailable' })
    );
    return router;
  }

  const svc = createDeliberationGovernanceService(pool, log);

  router.get('/schema', requireKey, (_req, res) => {
    res.json({
      ok: true,
      protocol_version: 'v2.7',
      valid_authorities: VALID_AUTHORITIES,
      valid_rep_catalog: VALID_REP_CATALOG,
      cncl_roster_shape: {
        session_id: 'string (required)',
        authorities: 'ChC|Hist|SNT|CFO|BPB|SDO|CDR[]',
        reps: '{ name: string }[]',
        models: '{ id, focus, authorities?, reps? }[]',
        partial: 'boolean',
        founder_priority_mode: 'boolean',
      },
    });
  });

  router.post('/roster', requireKey, async (req, res) => {
    try {
      const result = await svc.createRoster(req.body);
      if (!result.ok) return res.status(400).json(result);
      res.status(201).json(result);
    } catch (e) {
      return respondDeliberationError(res, log, 'roster', e);
    }
  });

  router.get('/roster/:sessionId', requireKey, async (req, res) => {
    try {
      const roster = await svc.getRosterBySession(req.params.sessionId);
      if (!roster) return res.status(404).json({ ok: false, error: 'not found' });
      res.json({ ok: true, roster });
    } catch (e) {
      return respondDeliberationError(res, log, 'roster get', e);
    }
  });

  router.post('/roster/:sessionId/expand', requireKey, async (req, res) => {
    try {
      const result = await svc.expandRoster(req.params.sessionId, req.body);
      if (!result.ok) {
        const code = result.errors?.includes('session_id not found') ? 404 : 400;
        return res.status(code).json(result);
      }
      res.json({ ok: true, roster: result.roster });
    } catch (e) {
      return respondDeliberationError(res, log, 'roster expand', e);
    }
  });

  router.post('/hist-case', requireKey, async (req, res) => {
    try {
      const result = await svc.recordHistCase(req.body);
      if (!result.ok) return res.status(400).json(result);
      res.status(201).json(result);
    } catch (e) {
      return respondDeliberationError(res, log, 'hist-case', e);
    }
  });

  router.post('/cfo-receipt', requireKey, async (req, res) => {
    try {
      const result = await svc.recordCfoReceipt(req.body);
      if (!result.ok) return res.status(400).json(result);
      res.status(201).json(result);
    } catch (e) {
      return respondDeliberationError(res, log, 'cfo-receipt', e);
    }
  });

  router.post('/consensus', requireKey, async (req, res) => {
    try {
      const result = await svc.recordConsensusSession(req.body);
      if (!result.ok) return res.status(400).json(result);
      res.status(201).json(result);
    } catch (e) {
      return respondDeliberationError(res, log, 'consensus', e);
    }
  });

  router.post('/scorecard', requireKey, async (req, res) => {
    try {
      const result = await svc.recordScorecardEntry(req.body);
      if (!result.ok) return res.status(400).json(result);
      res.status(201).json(result);
    } catch (e) {
      return respondDeliberationError(res, log, 'scorecard post', e);
    }
  });

  router.get('/scorecard', requireKey, async (req, res) => {
    try {
      const rows = await svc.listScorecard({
        decision_type: req.query.decision_type,
        limit: req.query.limit,
      });
      res.json({ ok: true, entries: rows });
    } catch (e) {
      return respondDeliberationError(res, log, 'scorecard get', e);
    }
  });

  router.post('/evidence-vault', requireKey, async (req, res) => {
    try {
      const result = await svc.recordEvidenceVaultEntry(req.body);
      if (!result.ok) return res.status(400).json(result);
      res.status(201).json(result);
    } catch (e) {
      return respondDeliberationError(res, log, 'evidence-vault', e);
    }
  });

  router.get('/gate/:sessionId', requireKey, async (req, res) => {
    try {
      const status = await svc.getGateStatus(req.params.sessionId, {
        load_bearing: req.query.load_bearing === 'true',
      });
      res.json({ ok: true, ...status });
    } catch (e) {
      return respondDeliberationError(res, log, 'gate get', e);
    }
  });

  router.post('/gate/pass', requireKey, async (req, res) => {
    try {
      const result = await svc.passDeliberationGate(req.body);
      const code = result.ok ? 200 : 422;
      res.status(code).json(result);
    } catch (e) {
      return respondDeliberationError(res, log, 'gate pass', e);
    }
  });

  router.get('/session/:sessionId', requireKey, async (req, res) => {
    try {
      const bundle = await svc.getSessionBundle(req.params.sessionId);
      res.json({ ok: true, bundle });
    } catch (e) {
      return respondDeliberationError(res, log, 'session', e);
    }
  });

  router.get('/debrief/:sessionId', requireKey, async (req, res) => {
    try {
      const stored = await svc.getStoredDebrief(req.params.sessionId);
      if (stored && req.query.regenerate !== 'true') {
        return res.json({ ok: true, debrief: stored, source: 'stored' });
      }
      const result = await svc.generateFounderDebrief(req.params.sessionId, { persist: true });
      if (!result.ok) {
        return res.status(404).json(result);
      }
      res.json({ ok: true, ...result, source: 'generated' });
    } catch (e) {
      return respondDeliberationError(res, log, 'debrief', e);
    }
  });

  router.post('/pipeline/seed', requireKey, async (req, res) => {
    try {
      const result = await svc.seedPipelineMinimum(req.body);
      if (!result.ok) return res.status(400).json(result);
      res.status(201).json(result);
    } catch (e) {
      return respondDeliberationError(res, log, 'pipeline seed', e);
    }
  });

  router.post('/pipeline/finalize', requireKey, async (req, res) => {
    try {
      const result = await svc.finalizePipeline(req.body);
      const code = result.ok ? 200 : 422;
      res.status(code).json(result);
    } catch (e) {
      return respondDeliberationError(res, log, 'pipeline finalize', e);
    }
  });

  router.post('/reps/sync', requireKey, async (_req, res) => {
    try {
      const result = await svc.syncRepCatalogFromConfig();
      res.json(result);
    } catch (e) {
      return respondDeliberationError(res, log, 'reps sync', e);
    }
  });

  router.get('/reps', requireKey, async (_req, res) => {
    try {
      const reps = await svc.listRepCatalog();
      res.json({ ok: true, reps });
    } catch (e) {
      return respondDeliberationError(res, log, 'reps', e);
    }
  });

  return router;
}
