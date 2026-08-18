import {
  ensureCostelloInfrastructure,
  getCostelloInfrastructureGuardianStatus,
  startCostelloInfrastructureGuardian,
} from '../services/costello-infrastructure-guardian.js';

let mounted = false;

export function registerCostelloInfrastructureGuardianRoutes(app, deps = {}) {
  const logger = deps.logger || console;
  if (!mounted) {
    mounted = true;
    startCostelloInfrastructureGuardian({ logger });
  }

  app.get('/api/v1/runtime/costello-guardian/status', (_req, res) => {
    res.json({
      ok: true,
      guardian: getCostelloInfrastructureGuardianStatus(),
    });
  });

  const requireKey = typeof deps.requireKey === 'function' ? deps.requireKey : (_req, _res, next) => next();
  app.post('/api/v1/runtime/costello-guardian/check', requireKey, async (_req, res) => {
    const result = await ensureCostelloInfrastructure({ logger, forceDeploy: true });
    res.status(result.ok ? 200 : 503).json(result);
  });
}

export default registerCostelloInfrastructureGuardianRoutes;
