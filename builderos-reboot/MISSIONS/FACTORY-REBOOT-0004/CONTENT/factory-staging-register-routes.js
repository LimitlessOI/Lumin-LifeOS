import { factoryExecuteStepRoute } from '../factory-core/routes/factory-execute-step-routes.js';
import { buildBlockedReturn } from '../factory-core/builder/blocked-return.js';
import { getSandboxBoundary } from '../factory-core/builder/sandbox.js';

export function registerFactoryRoutes(app) {
  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'factory-staging',
      routes: [factoryExecuteStepRoute.path, '/health'],
    });
  });

  app.post(factoryExecuteStepRoute.path, (req, res) => {
    const step = req.body?.step;
    if (!step?.step_id || !step?.sandbox_boundary) {
      const blocked = buildBlockedReturn({
        mission_id: req.body?.mission_id || 'unknown',
        blueprint_id: req.body?.blueprint_id || 'unknown',
        step_id: step?.step_id || 'unknown',
        gap_type: 'missing_requirement',
        summary: 'execute-step requires frozen step object with step_id and sandbox_boundary',
        attempted_action: 'POST /factory/execute-step',
        missing_information: ['step.step_id', 'step.sandbox_boundary'],
        evidence: { bodyKeys: Object.keys(req.body || {}) },
      });
      return res.status(422).json(blocked);
    }

    const sandbox = getSandboxBoundary(step);
    res.status(501).json({
      ok: false,
      status: 'NOT_IMPLEMENTED',
      message: 'Full execute-step dispatch is stubbed; payloads and routes are materialized.',
      sandbox,
      allowedOutputs: factoryExecuteStepRoute.allowedOutputs,
    });
  });
}
