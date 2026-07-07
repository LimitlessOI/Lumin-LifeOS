/**
 * SYNOPSIS: Registers FactoryRoutes routes/handlers (factory-staging/startup/register-routes.js).
 */
import { factoryExecuteStepRoute } from '../factory-core/routes/factory-execute-step-routes.js';
import { factoryExecuteMissionRoute } from '../factory-core/routes/factory-execute-mission-routes.js';
import { dispatchExecuteStep } from '../factory-core/builder/run-step.js';
import { dispatchExecuteMission } from '../factory-core/builder/run-mission.js';
import { getCouncilAdapterStatus, assertCouncilQuarantine } from '../factory-core/canon/services/council-adapter.js';
import { summarizeHistory } from '../factory-core/historian/mission-history.js';
import { summarizeHistorian } from '../factory-core/historian/append-record.js';
import { summarizeTsosMetrics } from '../factory-core/tsos/tsos-summary.js';
import { runBpbIntakeGate } from '../factory-core/bpb/intake-gate.js';
import { reconcileRemoteTruth } from '../factory-core/readiness/remote-truth-reconciler.js';
import { getC2SurfaceStatus, formatC2MissionBrief } from '../factory-core/lifeos/c2-surface.js';
import fs from 'node:fs';
import path from 'node:path';
import { detectLayout, FACTORY_ROOT, REPO_ROOT, machinePath } from '../factory-core/layout/repo-layout.js';

export function registerFactoryRoutes(app) {
  const layout = detectLayout();

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'factory-staging',
      layout: layout.mode,
      execute_step: 'live',
      execute_mission: 'live',
      greenfield: 'live',
      council: 'quarantine',
      upstream_gates: 'live',
      sentry_depth: 'live',
      historian: 'live',
      tsos: 'live',
      c2_surface: 'live',
      routes: [
        factoryExecuteStepRoute.path,
        factoryExecuteMissionRoute.path,
        '/factory/council/status',
        '/factory/readiness',
        '/factory/mission-history',
        '/factory/tsos/summary',
        '/factory/historian/summary',
        '/factory/gates/intake',
        '/factory/c2/status',
        '/factory/truth/reconcile',
        '/factory/canon/status',
        '/health',
      ],
    });
  });

  app.get('/factory/mission-history', (_req, res) => {
    res.json({ ok: true, history: summarizeHistory(), historian: summarizeHistorian() });
  });

  app.get('/factory/historian/summary', (_req, res) => {
    res.json({ ok: true, historian: summarizeHistorian() });
  });

  app.get('/factory/tsos/summary', (_req, res) => {
    res.json({
      ok: true,
      tsos: summarizeTsosMetrics(),
      guardrails: 'measurement_only_no_mission_authority',
    });
  });

  app.get('/factory/gates/intake', (req, res) => {
    const mission_id = req.query.mission_id;
    if (!mission_id) {
      return res.status(400).json({ ok: false, error: 'mission_id query required' });
    }
    const intake = runBpbIntakeGate(String(mission_id), { strict_pd: req.query.strict === 'true' });
    res.status(intake.ok ? 200 : 422).json({ ok: intake.ok, intake });
  });

  app.get('/factory/c2/status', (_req, res) => {
    res.json({ ok: true, c2: getC2SurfaceStatus() });
  });

  app.get('/factory/c2/brief', (req, res) => {
    const mission_id = req.query.mission_id || 'unknown';
    const intake = runBpbIntakeGate(String(mission_id));
    res.json({
      ok: true,
      brief: formatC2MissionBrief({ mission_id, mission_state: 'Building', intakeGate: intake }),
    });
  });

  app.get('/factory/truth/reconcile', (_req, res) => {
    const truth = reconcileRemoteTruth();
    res.status(truth.ok ? 200 : 503).json({ ok: truth.ok, truth });
  });

  app.get('/factory/canon/status', (_req, res) => {
    const canonDir = path.join(FACTORY_ROOT, 'factory-core/canon');
    const files = ['MISSION_STATE_MACHINE.json', 'MATURITY_CLASSIFICATION.json', 'PROOF_SOURCE_REGISTRY.json'];
    const loaded = Object.fromEntries(files.map((f) => [f, fs.existsSync(path.join(canonDir, f))]));
    res.json({ ok: true, canon: loaded, maturity_rule: 'docs_alone_earn_zero_runtime_maturity' });
  });

  app.get('/factory/readiness', (_req, res) => {
    const reportPath = machinePath(REPO_ROOT, layout, 'READINESS_REPORT.json');
    if (!fs.existsSync(reportPath)) {
      return res.status(503).json({ ok: false, error: 'READINESS_REPORT.json not generated yet' });
    }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const detPath = machinePath(REPO_ROOT, layout, 'DETERMINISM_RECEIPT.json');
    if (fs.existsSync(detPath)) {
      report.determinism = JSON.parse(fs.readFileSync(detPath, 'utf8'));
    }
    report.remote_truth = reconcileRemoteTruth();
    res.json({ ok: true, report });
  });

  app.get('/factory/council/status', (_req, res) => {
    try {
      assertCouncilQuarantine();
      res.json({ ok: true, council: getCouncilAdapterStatus() });
    } catch (err) {
      res.status(403).json({ ok: false, error: err.message });
    }
  });

  app.post(factoryExecuteMissionRoute.path, async (req, res) => {
    const { httpStatus, body } = await dispatchExecuteMission(req.body || {});
    res.status(httpStatus).json(body);
  });

  app.post(factoryExecuteStepRoute.path, async (req, res) => {
    const { httpStatus, body } = await dispatchExecuteStep(req.body || {});
    res.status(httpStatus).json(body);
  });
}
