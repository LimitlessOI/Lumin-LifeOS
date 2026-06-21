/**
 * SYNOPSIS: Exports createFactoryExecuteStepRoutes — factory-v1/routes/factory-execute-step-routes.js.
 */
import express from 'express';
import { runFrozenStep } from '../runtime/run-frozen-step.js';

export function createFactoryExecuteStepRoutes() {
  const router = express.Router();

  router.post('/execute-step', async (req, res, next) => {
    try {
      const { step, acceptanceTests } = req.body || {};
      if (!step || !Array.isArray(acceptanceTests)) {
        return res.status(400).json({
          status: 'BLOCKED_RETURN_TO_BPB',
          summary: 'Request body must include step and acceptanceTests.'
        });
      }

      const result = await runFrozenStep({ step, acceptanceTests });
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
