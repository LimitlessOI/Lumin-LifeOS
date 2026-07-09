/**
 * SYNOPSIS: Exports registerLifeosPhase3Routes — routes/lifeos-phase3-routes.js.
 */
const DEFAULT_SERVICE_IMPORTS = {
  habits: null,
};

function authGuard(req, deps) {
  if (typeof deps?.requireAuth === 'function') {
    return deps.requireAuth(req);
  }
  if (req?.user) return null;
  return { status: 401, body: { error: 'Unauthorized' } };
}

function sendJson(res, status, payload) {
  return res.status(status).json(payload);
}

function getDb(deps) {
  return deps?.db || deps?.pool;
}

function safeErrorMessage(err) {
  return err && typeof err.message === 'string' ? err.message : 'Internal Server Error';
}

async function callService(serviceFn, args, deps) {
  if (typeof serviceFn !== 'function') {
    throw new Error('Service function unavailable');
  }
  return await serviceFn(args, deps);
}

async function loadServices() {
  const services = {};
  try {
    services.habits = await import('../services/s2-habits-service.js');
  } catch {}
  try {
    services.energy = await import('../services/s3-energy-service.js');
  } catch {}
  try {
    services.finance = await import('../services/s4-finance-service.js');
  } catch {}
  try {
    services.learning = await import('../services/s5-learning-service.js');
  } catch {}
  try {
    services.calendarProtection = await import('../services/s6-calendar-protection-service.js');
  } catch {}
  return services;
}

export async function registerLifeosPhase3Routes(app, deps = {}) {
  const services = await loadServices();
  const db = getDb(deps);

  const requireAuth = (req, res) => {
    const auth = authGuard(req, deps);
    if (auth) {
      sendJson(res, auth.status, auth.body);
      return false;
    }
    return true;
  };

  app.get('/api/v1/lifeos/habits', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.habits?.getHabits ||
        services.habits?.listHabits ||
        services.habits?.default?.getHabits ||
        services.habits?.default?.listHabits;
      const data = await callService(fn, { req, db, user: req.user }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos habits get failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.post('/api/v1/lifeos/habits', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.habits?.createHabit ||
        services.habits?.default?.createHabit;
      const data = await callService(fn, { req, db, user: req.user, body: req.body }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos habits post failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.post('/api/v1/lifeos/habits/:id/log', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.habits?.logHabit ||
        services.habits?.default?.logHabit;
      const data = await callService(fn, { req, db, user: req.user, habitId: req.params.id, body: req.body }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos habits log failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.get('/api/v1/lifeos/energy', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.energy?.getEnergy ||
        services.energy?.listEnergy ||
        services.energy?.default?.getEnergy ||
        services.energy?.default?.listEnergy;
      const data = await callService(fn, { req, db, user: req.user }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos energy get failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.post('/api/v1/lifeos/energy', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.energy?.createEnergy ||
        services.energy?.default?.createEnergy;
      const data = await callService(fn, { req, db, user: req.user, body: req.body }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos energy post failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.get('/api/v1/lifeos/energy/curve', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.energy?.getEnergyCurve ||
        services.energy?.default?.getEnergyCurve;
      const data = await callService(fn, { req, db, user: req.user }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos energy curve failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.get('/api/v1/lifeos/finance/net-worth', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.finance?.getNetWorth ||
        services.finance?.default?.getNetWorth;
      const data = await callService(fn, { req, db, user: req.user }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos finance net worth get failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.post('/api/v1/lifeos/finance/net-worth', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.finance?.updateNetWorth ||
        services.finance?.createNetWorth ||
        services.finance?.default?.updateNetWorth ||
        services.finance?.default?.createNetWorth;
      const data = await callService(fn, { req, db, user: req.user, body: req.body }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos finance net worth post failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.get('/api/v1/lifeos/learning', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.learning?.listLearning ||
        services.learning?.getLearning ||
        services.learning?.default?.listLearning ||
        services.learning?.default?.getLearning;
      const data = await callService(fn, { req, db, user: req.user }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos learning get failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.post('/api/v1/lifeos/learning', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.learning?.createLearning ||
        services.learning?.default?.createLearning;
      const data = await callService(fn, { req, db, user: req.user, body: req.body }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos learning post failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.patch('/api/v1/lifeos/learning', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.learning?.updateLearning ||
        services.learning?.default?.updateLearning;
      const data = await callService(fn, { req, db, user: req.user, body: req.body }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos learning patch failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.delete('/api/v1/lifeos/learning', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.learning?.deleteLearning ||
        services.learning?.default?.deleteLearning;
      const data = await callService(fn, { req, db, user: req.user, body: req.body }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos learning delete failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.post('/api/v1/lifeos/calendar-protection/rules', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.calendarProtection?.createRule ||
        services.calendarProtection?.addRule ||
        services.calendarProtection?.default?.createRule ||
        services.calendarProtection?.default?.addRule;
      const data = await callService(fn, { req, db, user: req.user, body: req.body }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos calendar protection rules post failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.get('/api/v1/lifeos/calendar-protection/rules', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.calendarProtection?.listRules ||
        services.calendarProtection?.getRules ||
        services.calendarProtection?.default?.listRules ||
        services.calendarProtection?.default?.getRules;
      const data = await callService(fn, { req, db, user: req.user }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos calendar protection rules get failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  app.post('/api/v1/lifeos/calendar-protection/scan', async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const fn =
        services.calendarProtection?.scanCalendar ||
        services.calendarProtection?.scanProtection ||
        services.calendarProtection?.default?.scanCalendar ||
        services.calendarProtection?.default?.scanProtection;
      const data = await callService(fn, { req, db, user: req.user, body: req.body }, deps);
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos calendar protection scan failed');
      return sendJson(res, 500, { ok: false, error: safeErrorMessage(err) });
    }
  });

  return true;
}

export default registerLifeosPhase3Routes;