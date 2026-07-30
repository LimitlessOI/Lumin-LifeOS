/**
 * SYNOPSIS: BuilderOS Control Plane API — measurement health + build ledger.
 * BuilderOS Control Plane API — measurement health + build ledger.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { Router } from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  buildRuntimeFingerprintReport,
  parseRuntimeFingerprintPaths,
} from '../scripts/lib/runtime-fingerprint.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function createBuilderOSControlPlaneRoutes({ pool, requireKey, controlPlane }) {
  const router = Router();
  router.use(requireKey);

  router.get('/health', async (_req, res) => {
    try {
      const health = await controlPlane.getMeasurementHealth();
      res.json({ ok: true, ...health });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/summary', async (_req, res) => {
    try {
      const summary = await controlPlane.getControlPlaneSummary();
      res.json({ ok: true, ...summary });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/builds/:task_id', async (req, res) => {
    try {
      const build = await controlPlane.getBuildByTaskId(req.params.task_id);
      if (!build) return res.status(404).json({ ok: false, error: 'build_not_found' });
      res.json({ ok: true, build });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/builds/:task_id/done-gate', async (req, res) => {
    try {
      const gate = await controlPlane.canMarkBuildDone({
        task_id: req.params.task_id,
        allow_exception: req.query.allow_exception === 'true',
      });
      res.json({ ok: true, ...gate });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/builds/start', async (req, res) => {
    try {
      const row = await controlPlane.recordBuildStart(req.body || {});
      res.status(201).json({ ok: true, build: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/builds/complete', async (req, res) => {
    try {
      const row = await controlPlane.recordBuildComplete(req.body || {});
      res.json({ ok: true, build: row });
    } catch (err) {
      const blocked = String(err.message || '').startsWith('BUILDEROS_DONE_BLOCKED');
      res.status(blocked ? 409 : 400).json({ ok: false, error: err.message });
    }
  });

  router.get('/tasks-without-proof', async (req, res) => {
    try {
      const rows = await controlPlane.getTasksWithoutProof(req.query.limit);
      res.json({ ok: true, count: rows.length, tasks: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /** S00: $ spend → shipped outcomes. ?hours=168&usd=20 */
  router.get('/spend-outcomes', async (req, res) => {
    try {
      const report = await controlPlane.getSpendOutcomesReport({
        sinceHours: req.query.hours ? Number(req.query.hours) : 168,
        spendUsd: req.query.usd != null && req.query.usd !== '' ? Number(req.query.usd) : null,
      });
      const status = report.blind && (process.env.SPEND_OUTCOME_STRICT === '1') ? 409 : 200;
      res.status(status).json(report);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /** S00: estimate duration+$ for named builds from history */
  router.post('/estimate', async (req, res) => {
    try {
      const body = req.body || {};
      const items = Array.isArray(body.items)
        ? body.items
        : Array.isArray(body.builds)
          ? body.builds
          : [body];
      const estimate = await controlPlane.estimateBuilds({ items });
      res.json(estimate);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/linkage', async (req, res) => {
    try {
      const stats = await controlPlane.getLinkageStats({
        sinceHours: req.query.hours ? Number(req.query.hours) : 168,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      });
      res.json({ ok: true, ...stats });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * Q-001: prove container disk bytes for allowlisted repo paths (sha256).
   * GET /runtime-fingerprint?paths=routes/foo.js,services/bar.js
   */
  router.get('/runtime-fingerprint', (req, res) => {
    try {
      const paths = parseRuntimeFingerprintPaths(req.query.paths || req.query.path || '');
      if (!paths.length) {
        return res.status(400).json({
          ok: false,
          error: 'paths query required (comma-separated repo-relative allowlisted paths)',
        });
      }
      const report = buildRuntimeFingerprintReport({
        repoRoot: REPO_ROOT,
        paths,
        deployCommitSha: process.env.RAILWAY_GIT_COMMIT_SHA || null,
      });
      const status = report.ok ? 200 : 400;
      res.status(status).json(report);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
