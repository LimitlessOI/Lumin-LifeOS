/**
 * SYNOPSIS: LifeOS Phase 3 REST — habits / energy / learning / calendar-protection.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { createLifeOSHabits } from '../services/lifeos-habits.js';
import {
  logEnergy,
  getEnergyLogs,
  analyzeEnergyCurve,
} from '../services/lifeos-energy.js';
import {
  addItem,
  listItems,
  updateItem,
  deleteItem,
} from '../services/lifeos-learning.js';
import {
  upsertRule,
  listRules,
  deleteRule,
  scanConflicts,
} from '../services/lifeos-calendar-protection.js';


async function resolveAuthUserId(req, deps) {
  const resolve = makeLifeOSUserResolver(deps?.db || deps?.pool);
  const hint =
    req?.query?.user ||
    req?.body?.user ||
    req?.lifeosUser?.handle ||
    req?.lifeosUser?.sub ||
    req?.user?.id ||
    req?.user?.user_id ||
    req?.auth?.user_id ||
    'adam';
  return resolve(hint === 'emergency-key' ? 'adam' : hint);
}

async function authFail(req, res, deps) {
  const guard = deps?.requireKey || deps?.requireAuth;
  if (typeof guard === 'function') {
    let passed = false;
    await new Promise((resolve) => {
      try {
        guard(req, res, (err) => {
          if (!err && !res.headersSent) passed = true;
          resolve();
        });
      } catch {
        resolve();
      }
    });
    if (res.headersSent) return true;
    if (!passed) {
      res.status(401).json({ error: 'Unauthorized' });
      return true;
    }
    req.__lifeosUid = await resolveAuthUserId(req, deps);
    if (!req.__lifeosUid) {
      res.status(404).json({ ok: false, error: 'User not found' });
      return true;
    }
    return false;
  }
  res.status(401).json({ error: 'Unauthorized' });
  return true;
}

function resolveUserId(req) {
  return req.__lifeosUid || req?.user?.id || req?.user?.user_id || req?.auth?.user_id || null;
}

function dbOf(deps) {
  return deps?.db || deps?.pool;
}

/**
 * Mount Phase 3 APIs. Finance net-worth stays on the existing finance router
 * (`registerLifeOSFinanceRoutes`) — this module owns habits/energy/learning/calendar.
 */
export async function registerLifeosPhase3Routes(app, deps = {}) {
  const db = dbOf(deps);
  const habitsApi = createLifeOSHabits({ pool: db });

  app.get('/api/v1/lifeos/habits', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const rows = await habitsApi.listHabits(resolveUserId(req));
      return res.json({ ok: true, data: rows, habits: rows });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos habits list failed');
      return res.status(err.status || 500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/v1/lifeos/habits/summary', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const days = Number(req.query?.days) || 7;
      const summary = await habitsApi.getHabitSummary(resolveUserId(req), days);
      return res.json({ ok: true, ...summary });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos habits summary failed');
      return res.status(err.status || 500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/lifeos/habits', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const body = req.body || {};
      const row = await habitsApi.createHabit(resolveUserId(req), {
        title: body.title,
        identity_statement: body.identity_statement ?? body.identity,
        frequency: body.frequency || 'daily',
      });
      return res.status(201).json({ ok: true, data: row, habit: row });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos habits create failed');
      return res.status(err.status || 500).json({ ok: false, error: err.message });
    }
  });

  async function habitCheckIn(req, res) {
    if (await authFail(req, res, deps)) return;
    try {
      const row = await habitsApi.checkInHabit(resolveUserId(req), req.params.id, req.body || {});
      return res.json({ ok: true, data: row });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos habits check-in failed');
      return res.status(err.status || 500).json({ ok: false, error: err.message });
    }
  }

  app.post('/api/v1/lifeos/habits/:id/log', habitCheckIn);
  app.post('/api/v1/lifeos/habits/:id/checkin', habitCheckIn);

  app.get('/api/v1/lifeos/energy', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const rows = await getEnergyLogs(db, resolveUserId(req), {
        from: req.query?.from,
        to: req.query?.to,
      });
      return res.json({ ok: true, data: rows });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos energy list failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/lifeos/energy', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const body = req.body || {};
      const row = await logEnergy(
        db,
        resolveUserId(req),
        body.datetime || new Date().toISOString(),
        body.level,
        body.notes,
      );
      return res.status(201).json({ ok: true, data: row });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos energy log failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/v1/lifeos/energy/curve', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const data = await analyzeEnergyCurve(db, resolveUserId(req), deps.callCouncilMember);
      return res.json({ ok: true, data });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos energy curve failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/v1/lifeos/learning', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const rows = await listItems(db, resolveUserId(req), { status: req.query?.status });
      return res.json({ ok: true, data: rows });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos learning list failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/lifeos/learning', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const row = await addItem(db, resolveUserId(req), req.body || {});
      return res.status(201).json({ ok: true, data: row });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos learning add failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.patch('/api/v1/lifeos/learning/:id', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const row = await updateItem(db, resolveUserId(req), req.params.id, req.body || {});
      return res.json({ ok: true, data: row });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos learning patch failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.delete('/api/v1/lifeos/learning/:id', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const ok = await deleteItem(db, resolveUserId(req), req.params.id);
      return res.json({ ok: true, deleted: ok });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos learning delete failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/v1/lifeos/calendar-protection/rules', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const rows = await listRules(db, resolveUserId(req));
      return res.json({ ok: true, data: rows });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos calendar rules list failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/lifeos/calendar-protection/rules', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const row = await upsertRule(db, resolveUserId(req), req.body || {});
      return res.status(201).json({ ok: true, data: row });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos calendar rules upsert failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.delete('/api/v1/lifeos/calendar-protection/rules/:id', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const ok = await deleteRule(db, resolveUserId(req), req.params.id);
      return res.json({ ok: true, deleted: ok });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos calendar rules delete failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/lifeos/calendar-protection/scan', async (req, res) => {
    if (await authFail(req, res, deps)) return;
    try {
      const events = Array.isArray(req.body?.events) ? req.body.events : req.body?.calendarEvents || [];
      const conflicts = await scanConflicts(db, resolveUserId(req), events);
      return res.json({ ok: true, data: conflicts });
    } catch (err) {
      deps.logger?.error?.({ err }, 'lifeos calendar scan failed');
      return res.status(500).json({ ok: false, error: err.message });
    }
  });
}

export default registerLifeosPhase3Routes;