/**
 * Exported Lumin factory HTTP route registration.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import { factoryExecuteStepRoute } from '../factory-core/routes/factory-execute-step-routes.js';
import { factoryExecuteMissionRoute } from '../factory-core/routes/factory-execute-mission-routes.js';
import { dispatchExecuteStep } from '../factory-core/builder/run-step.js';
import { dispatchExecuteMission } from '../factory-core/builder/run-mission.js';
import { runVerification, appendStepReceipt } from '../factory-core/sentry/run-verification.js';
import { getCouncilAdapterStatus, assertCouncilQuarantine } from '../factory-core/canon/services/council-adapter.js';
import { summarizeHistory } from '../factory-core/historian/mission-history.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { REPO_ROOT } from '../factory-core/builder/run-step.js';

function getPresentedFactoryKey(req) {
  const authorization = req.get('authorization') || '';
  if (authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim();
  }
  return req.get('x-command-key') || req.get('x-factory-key') || '';
}

function secureEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function requireFactoryWriteAuth(req, res, next) {
  const requiredKey = process.env.FACTORY_COMMAND_KEY || process.env.COMMAND_CENTER_KEY || '';
  if (!requiredKey) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ ok: false, error: 'FACTORY_COMMAND_KEY required for mutation routes' });
    }
    return next();
  }

  if (!secureEqual(getPresentedFactoryKey(req), requiredKey)) {
    return res.status(401).json({ ok: false, error: 'unauthorized_factory_mutation' });
  }
  return next();
}

export function registerFactoryRoutes(app) {
  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'factory-staging',
      execute_step: 'live',
      execute_mission: 'live',
      greenfield: 'live',
      council: 'quarantine',
      routes: [
        factoryExecuteStepRoute.path,
        factoryExecuteMissionRoute.path,
        '/factory/council/status',
        '/factory/readiness',
        '/factory/mission-history',
        '/health',
      ],
    });
  });

  app.get('/factory/mission-history', (_req, res) => {
    res.json({ ok: true, history: summarizeHistory() });
  });

  app.get('/factory/readiness', (_req, res) => {
    const reportPath = path.join(REPO_ROOT, 'builderos-reboot/READINESS_REPORT.json');
    if (!fs.existsSync(reportPath)) {
      return res.status(503).json({ ok: false, error: 'READINESS_REPORT.json not generated yet' });
    }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const detPath = path.join(REPO_ROOT, 'builderos-reboot/DETERMINISM_RECEIPT.json');
    if (fs.existsSync(detPath)) {
      report.determinism = JSON.parse(fs.readFileSync(detPath, 'utf8'));
    }
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

  app.post(factoryExecuteMissionRoute.path, requireFactoryWriteAuth, (req, res) => {
    const { httpStatus, body } = dispatchExecuteMission(req.body || {});
    res.status(httpStatus).json(body);
  });

  app.post(factoryExecuteStepRoute.path, requireFactoryWriteAuth, (req, res) => {
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
        input_mode: builderResult.input_mode,
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
