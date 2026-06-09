import { factoryExecuteStepRoute } from '../factory-core/routes/factory-execute-step-routes.js';
import { factoryExecuteMissionRoute } from '../factory-core/routes/factory-execute-mission-routes.js';
import { dispatchExecuteStep } from '../factory-core/builder/run-step.js';
import { dispatchExecuteMission } from '../factory-core/builder/run-mission.js';
import { runVerification, appendStepReceipt } from '../factory-core/sentry/run-verification.js';

export function registerFactoryRoutes(app) {
  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'factory-staging',
      execute_step: 'live',
      execute_mission: 'live',
      routes: [factoryExecuteStepRoute.path, factoryExecuteMissionRoute.path, '/health'],
    });
  });

  app.post(factoryExecuteMissionRoute.path, (req, res) => {
    const { httpStatus, body } = dispatchExecuteMission(req.body || {});
    res.status(httpStatus).json(body);
  });

  app.post(factoryExecuteStepRoute.path, (req, res) => {
    const { httpStatus, body } = dispatchExecuteStep(req.body || {});
    const step = req.body?.step;

    if (step && (body.status === 'DONE' || body.builder?.status === 'DONE')) {
      const builderResult = body.builder || body;
      const sentry = runVerification(step, builderResult);
      appendStepReceipt({
        mission_id: req.body?.mission_id,
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
