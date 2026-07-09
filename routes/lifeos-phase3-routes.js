/**
 * SYNOPSIS: Registers LifeosPhase3Routes routes/handlers (routes/lifeos-phase3-routes.js).
 */
import { registerLifeosPhase3Routes as registerHabitRoutes } from './s2-habits.js';
import { registerLifeosPhase3Routes as registerEnergyRoutes } from './s3-energy.js';
import { registerLifeosPhase3Routes as registerFinanceRoutes } from './s4-finance.js';
import { registerLifeosPhase3Routes as registerLearningRoutes } from './s5-learning.js';
import { registerLifeosPhase3Routes as registerCalendarProtectionRoutes } from './s6-calendar-protection.js';

function resolveAuthGuard(deps) {
  if (deps && typeof deps.requireAuth === 'function') return deps.requireAuth;
  return function fallbackAuthGuard(req, res, next) {
    if (req && req.user) return next();
    res.status(401).json({ ok: false, error: 'Unauthorized' });
  };
}

function mountWithGuard(app, method, path, guard, handler) {
  app[method](path, guard, async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      next(err);
    }
  });
}

export function registerLifeosPhase3Routes(app, deps = {}) {
  const guard = resolveAuthGuard(deps);
  const childDeps = { ...deps, requireAuth: guard };

  if (typeof registerHabitRoutes === 'function') registerHabitRoutes(app, childDeps);
  if (typeof registerEnergyRoutes === 'function') registerEnergyRoutes(app, childDeps);
  if (typeof registerFinanceRoutes === 'function') registerFinanceRoutes(app, childDeps);
  if (typeof registerLearningRoutes === 'function') registerLearningRoutes(app, childDeps);
  if (typeof registerCalendarProtectionRoutes === 'function') registerCalendarProtectionRoutes(app, childDeps);

  return app;
}

export default registerLifeosPhase3Routes;