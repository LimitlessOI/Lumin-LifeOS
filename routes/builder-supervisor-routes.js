/**
 * SYNOPSIS: routes/builder-supervisor-routes.js
 * routes/builder-supervisor-routes.js
 *
 * API surface for the headless builder supervisor.
 *
 * Routes:
 *   POST /api/v1/builder/run          trigger a supervisor run (non-blocking)
 *   POST /api/v1/builder/run-sync     trigger a run and wait for completion (dev/testing)
 *   GET  /api/v1/builder/status       last run summary + currently running?
 *   GET  /api/v1/builder/queue        segments that are queued / in-progress
 *   POST /api/v1/builder/pause        set PAUSE_AUTONOMY-equivalent in memory
 *   POST /api/v1/builder/resume       clear the pause
 *   GET  /api/v1/builder/economics/estimate  predict a project's build cost + time (measured only)
 *   GET  /api/v1/builder/economics/history   recorded per-segment cost/time + averages
 *   GET  /api/v1/builder/duration-truth      host clock + measured blueprint/install averages
 *
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */

import { Router } from 'express';
import { estimateProjectBuild, getHistoryStats, estimateSegments } from '../services/build-economics.js';
import {
  buildDurationTruthSnapshot,
  enforceMeasuredEconomicsEstimate,
  estimateFromMeasuredHistory,
  getSystemClock,
  OPERATION_CLASSES,
} from '../services/duration-truth.js';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const SUPERVISOR_SCRIPT = path.join(ROOT, 'scripts', 'autonomy', 'builder-supervisor.js');
const LAST_RUN_PATH     = path.join(ROOT, 'scripts', 'autonomy', 'last-supervisor-run.json');

// In-memory state (per-process, resets on redeploy — that's intentional)
const state = {
  paused: false,
  running: false,
  runningPid: null,
  runStartedAt: null,
};

function readLastRun() {
  try {
    if (!fs.existsSync(LAST_RUN_PATH)) return null;
    return JSON.parse(fs.readFileSync(LAST_RUN_PATH, 'utf8'));
  } catch { return null; }
}

function spawnSupervisor(extraArgs = []) {
  const args = [SUPERVISOR_SCRIPT, ...extraArgs];
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
    detached: false,
  });

  state.running    = true;
  state.runningPid = child.pid;
  state.runStartedAt = new Date().toISOString();

  child.on('close', () => {
    state.running    = false;
    state.runningPid = null;
  });

  return child;
}

export function createBuilderSupervisorRoutes({ requireKey, pool }) {
  const router = Router();

  // ── POST /api/v1/builder/run ────────────────────────────────────────────────
  // Trigger a supervisor run asynchronously. Returns immediately.
  router.post('/run', requireKey, async (req, res) => {
    if (state.paused) {
      return res.status(409).json({ ok: false, error: 'Builder is paused — POST /api/v1/builder/resume first' });
    }
    if (state.running) {
      return res.status(409).json({ ok: false, error: 'Supervisor already running', pid: state.runningPid });
    }
    if (process.env.LIFEOS_DIRECTED_MODE === 'true') {
      return res.status(403).json({ ok: false, error: 'LIFEOS_DIRECTED_MODE=true — builder is disabled' });
    }

    const extraArgs = [];
    if (req.body?.project) extraArgs.push('--project', req.body.project);
    if (req.body?.dry_run) extraArgs.push('--dry-run');
    if (req.body?.max_concurrent) extraArgs.push('--max-concurrent', String(req.body.max_concurrent));

    const child = spawnSupervisor(extraArgs);
    res.json({ ok: true, pid: child.pid, startedAt: state.runStartedAt, message: 'Supervisor started — check /api/v1/builder/status for results' });
  });

  // ── POST /api/v1/builder/run-sync ──────────────────────────────────────────
  // Trigger a dry-run synchronously and return results. Useful for testing.
  // Only allows dry-run in sync mode to avoid long-held HTTP connections.
  router.post('/run-sync', requireKey, async (req, res) => {
    const dryRun = req.body?.dry_run !== false; // defaults to dry-run for safety
    if (!dryRun) {
      return res.status(400).json({ ok: false, error: 'run-sync only supports dry_run:true for safety. Use POST /run for real execution.' });
    }

    const extraArgs = ['--dry-run'];
    if (req.body?.project) extraArgs.push('--project', req.body.project);

    const child = spawnSupervisor(extraArgs);

    await new Promise((resolve) => child.on('close', resolve));
    const lastRun = readLastRun();
    res.json({ ok: true, lastRun });
  });

  // ── GET /api/v1/builder/status ─────────────────────────────────────────────
  router.get('/status', requireKey, async (req, res) => {
    const lastRun = readLastRun();

    // Check currently in-progress segments
    const { rows: inProgress } = await pool.query(`
      SELECT ps.id, ps.title, ps.started_at, p.slug AS project_slug
      FROM project_segments ps
      JOIN projects p ON ps.project_id = p.id
      WHERE ps.status = 'in_progress'
      ORDER BY ps.started_at DESC
    `);

    // Check pending safe segments (work available)
    const { rows: [{ count: pendingCount }] } = await pool.query(`
      SELECT COUNT(*) FROM project_segments ps
      JOIN projects p ON ps.project_id = p.id
      WHERE ps.status = 'pending' AND ps.stability_class = 'safe' AND p.status = 'active'
    `);

    // Pending-adam items from builder
    const { rows: pendingAdam } = await pool.query(`
      SELECT id, project_slug, title, created_at
      FROM pending_adam
      WHERE is_resolved = FALSE
        AND (title LIKE 'Builder%' OR title LIKE 'builder%')
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      ok: true,
      supervisor: {
        running: state.running,
        paused: state.paused,
        runningPid: state.runningPid,
        runStartedAt: state.runStartedAt,
        directedMode: process.env.LIFEOS_DIRECTED_MODE === 'true',
      },
      pendingSafeSegments: parseInt(pendingCount, 10),
      currentlyInProgress: inProgress,
      pendingAdamFromBuilder: pendingAdam,
      lastRun,
    });
  });

  // ── GET /api/v1/builder/queue ──────────────────────────────────────────────
  // All safe pending segments across all active projects
  router.get('/queue', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT
          ps.id, ps.title, ps.description, ps.stability_class,
          ps.estimated_hours, ps.sort_order, ps.status,
          p.slug AS project_slug, p.name AS project_name, p.priority AS project_priority
        FROM project_segments ps
        JOIN projects p ON ps.project_id = p.id
        WHERE ps.status IN ('pending', 'in_progress', 'blocked')
          AND p.status = 'active'
        ORDER BY
          CASE p.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
          ps.sort_order ASC
        LIMIT 50
      `);

      const safe     = rows.filter(r => r.stability_class === 'safe'         && r.status === 'pending');
      const review   = rows.filter(r => r.stability_class === 'needs-review' && r.status === 'pending');
      const highRisk = rows.filter(r => r.stability_class === 'high-risk'    && r.status === 'pending');
      const active   = rows.filter(r => r.status === 'in_progress');
      const blocked  = rows.filter(r => r.status === 'blocked');

      // Projected cost + ETA — measured history only (cold-start stripped / rejected).
      let projected = null;
      try {
        const summary = await getHistoryStats(pool);
        const pending = [...safe, ...review, ...highRisk];
        projected = {
          safe: enforceMeasuredEconomicsEstimate(estimateSegments(safe, summary)),
          allPending: enforceMeasuredEconomicsEstimate(estimateSegments(pending, summary)),
        };
      } catch (_) { /* estimate is best-effort; queue still returns without it */ }

      res.json({ ok: true, queue: { safe, review, highRisk, active, blocked }, projected });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /api/v1/builder/duration-truth ─────────────────────────────────────
  // Host clock + measured averages for blueprint / install. Never AI-guessed ETAs.
  router.get('/duration-truth', requireKey, (req, res) => {
    const stepCount = req.query.steps != null ? parseInt(req.query.steps, 10) : undefined;
    const snap = buildDurationTruthSnapshot({
      stepCount: Number.isFinite(stepCount) ? stepCount : undefined,
      minSamples: req.query.minSamples != null ? parseInt(req.query.minSamples, 10) : undefined,
    });
    res.json({ ok: true, ...snap });
  });

  // ── GET /api/v1/builder/economics/estimate ─────────────────────────────────
  // Predict cost + time for a project's remaining (or all) segments.
  // Founder-facing: cold-start / seed ETAs are rejected (duration-truth hard gate).
  router.get('/economics/estimate', requireKey, async (req, res) => {
    try {
      const projectId = parseInt(req.query.projectId, 10);
      if (!Number.isFinite(projectId)) {
        return res.status(400).json({ ok: false, error: 'projectId query param required (integer)' });
      }
      const includeDone = String(req.query.includeDone || '') === 'true';
      const raw = await estimateProjectBuild(pool, { projectId, includeDone });
      const gated = enforceMeasuredEconomicsEstimate(raw);
      if (!gated.allowed) {
        return res.status(422).json({
          ok: false,
          error: gated.reason,
          message: gated.message,
          clock: getSystemClock(),
          estimate: gated,
        });
      }
      res.json({
        ok: true,
        clock: getSystemClock(),
        estimate: gated,
        raw_confidence: raw.confidence,
        blueprint_foundation: estimateFromMeasuredHistory(OPERATION_CLASSES.BLUEPRINT_FOUNDATION, { minSamples: 2 }),
        install_step: estimateFromMeasuredHistory(OPERATION_CLASSES.INSTALL_STEP),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /api/v1/builder/economics/history ──────────────────────────────────
  // Recent recorded segment economics + rolling averages (by stability class).
  router.get('/economics/history', requireKey, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 25, 200);
      const summary = await getHistoryStats(pool);
      const { rows } = await pool.query(
        `SELECT id, segment_id, project_id, project_slug, stability_class, agent, model,
                outcome, review_ms, agent_ms, verify_ms, total_ms,
                total_tokens, estimated_usd, files_changed, lines_added, lines_deleted, created_at
           FROM build_economics
          ORDER BY created_at DESC
          LIMIT $1`,
        [limit],
      );
      res.json({ ok: true, summary, recent: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /api/v1/builder/pause ─────────────────────────────────────────────
  router.post('/pause', requireKey, (req, res) => {
    state.paused = true;
    res.json({ ok: true, message: 'Builder paused — in-flight run will still complete, but no new runs will start' });
  });

  // ── POST /api/v1/builder/resume ────────────────────────────────────────────
  router.post('/resume', requireKey, (req, res) => {
    state.paused = false;
    res.json({ ok: true, message: 'Builder resumed — POST /api/v1/builder/run to start a run' });
  });

  return router;
}
