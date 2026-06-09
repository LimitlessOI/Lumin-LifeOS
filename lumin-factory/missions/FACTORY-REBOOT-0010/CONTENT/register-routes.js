import { factoryExecuteStepRoute } from '../factory-core/routes/factory-execute-step-routes.js';
import { factoryExecuteMissionRoute } from '../factory-core/routes/factory-execute-mission-routes.js';
import { dispatchExecuteStep } from '../factory-core/builder/run-step.js';
import { dispatchExecuteMission } from '../factory-core/builder/run-mission.js';
import { runVerification, appendStepReceipt } from '../factory-core/sentry/run-verification.js';
import { getCouncilAdapterStatus, assertCouncilQuarantine } from '../factory-core/canon/services/council-adapter.js';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../factory-core/builder/run-step.js';

export function registerFactoryRoutes(app) {
  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'factory-staging',
      execute_step: 'live',
      execute_mission: 'live',
      council: 'quarantine',
      routes: [
        factoryExecuteStepRoute.path,
        factoryExecuteMissionRoute.path,
        '/factory/council/status',
        '/factory/readiness',
        '/health',
      ],
    });
  });

  app.get('/factory/readiness', (_req, res) => {
    const reportPath = path.join(REPO_ROOT, 'builderos-reboot/READINESS_REPORT.json');
    if (!fs.existsSync(reportPath)) {
      return res.status(503).json({ ok: false, error: 'READINESS_REPORT.json not generated yet' });
    }
    res.json({ ok: true, report: JSON.parse(fs.readFileSync(reportPath, 'utf8')) });
  });

  app.get('/factory/council/status', (_req, res) => {
    try {
      assertCouncilQuarantine();
      res.json({ ok: true, council: getCouncilAdapterStatus() });
    } catch (err) {
      res.status(403).json({ ok: false, error: err.message });
    }
  });

  app.post(factoryExecuteMissionRoute.path, (req, res) => {
    const { httpStatus, body } = dispatchExecuteMission(req.body || {});
    res.status(httpStatus).json(body);
  });

  app.post(factoryExecuteStepRoute.path, (req, res) => {
    const { httpStatus, body } = dispatchExecuteStep(req.body || {});
    const step = req.body?.step;
    const mission_id = req.body?.mission_id;

    if (step && (body.status === 'DONE' || body.builder?.status === 'DONE')) {
      const builderResult = body.builder || body;
      const sentry = runVerification(step, builderResult, { mission_id });
      appendStepReceipt({
        mission_id,
        blueprint_id: req.body?.blueprint_id,
        step_id: step.step_id,
        builder_status: builderResult.status,
        sentry_status: sentry.implementation_status,
        target_file: builderResult.target_file,
        sha256: builderResult.sha256,
      });
      if (httpStatus === 200) {
        return res.status(200).json({ ...body, sentry });
      }
    }

    res.status(httpStatus).json(body);
  });
}
