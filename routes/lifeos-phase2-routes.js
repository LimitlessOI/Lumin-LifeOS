/**
 * SYNOPSIS: Registers LifeosPhase2Routes routes/handlers (routes/lifeos-phase2-routes.js).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function registerLifeosPhase2Routes(app, deps = {}) {
  const pool = deps.pool || deps.db;
  const requireKey = deps.requireKey;
  const callCouncilMember = deps.callCouncilMember;
  const logger = deps.logger || console;
  const resolveUserId = makeLifeOSUserResolver(pool);

  const json = (res, status, payload) => res.status(status).json(payload);

  const getUserHint = (req) => {
    const hint =
      req.query?.user ??
      req.body?.user ??
      req.lifeosUser?.handle ??
      req.lifeosUser?.sub ??
      req.user?.id ??
      req.user?.user_id ??
      req.user?.sub ??
      'adam';
    return hint === 'emergency-key' ? 'adam' : hint;
  };

  const ensureUser = async (req, res) => {
    const userId = await resolveUserId(getUserHint(req));
    if (!userId) {
      json(res, 401, { error: 'unauthorized' });
      return null;
    }
    return userId;
  };

  const safeJson = (value, fallback) => {
    if (value == null) return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const wrap = (handler) => async (req, res) => {
    try {
      return await handler(req, res);
    } catch (err) {
      logger.error?.({ err }, 'lifeos phase2 route failed');
      return json(res, 500, { error: 'internal_error' });
    }
  };

  const postProtected = (path, ...handlers) => app.post(path, requireKey, ...handlers);
  const patchProtected = (path, ...handlers) => app.patch(path, requireKey, ...handlers);

  const sleepTable = 'lifeos_sleep_logs';
  const habitsTable = 'lifeos_habits';
  const habitLogsTable = 'lifeos_habit_logs';
  const gratitudeTable = 'lifeos_gratitude_logs';
  const netWorthTable = 'lifeos_net_worth_snapshots';
  const futureLettersTable = 'lifeos_future_self_letters';
  const energyTable = 'lifeos_energy_logs';
  const importantDatesTable = 'lifeos_important_dates';
  const learningQueueTable = 'lifeos_learning_queue';

  app.post('/api/v1/lifeos/sleep', requireKey, wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const { slept_at, woke_at, hours_slept, quality, notes } = req.body || {};
    const result = await pool.query(
      `insert into ${sleepTable} (user_id, slept_at, woke_at, hours_slept, quality, notes)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [userId, slept_at || null, woke_at || null, hours_slept ?? null, quality ?? null, notes ?? null]
    );
    return json(res, 201, { sleep: result.rows[0] });
  }));

  app.get('/api/v1/lifeos/sleep/summary', requireKey, wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const result = await pool.query(
      `select
         count(*)::int as count,
         coalesce(avg(hours_slept), 0) as avg_hours,
         coalesce(avg(quality), 0) as avg_quality
       from ${sleepTable}
       where user_id = $1`,
      [userId]
    );
    return json(res, 200, { summary: result.rows[0] || { count: 0, avg_hours: 0, avg_quality: 0 } });
  }));

  postProtected('/api/v1/lifeos/habits', wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const { name, description, target_frequency, active } = req.body || {};
    const result = await pool.query(
      `insert into ${habitsTable} (user_id, name, description, target_frequency, active)
       values ($1, $2, $3, $4, coalesce($5, true))
       returning *`,
      [userId, name ?? null, description ?? null, target_frequency ?? null, active]
    );
    return json(res, 201, { habit: result.rows[0] });
  }));

  postProtected('/api/v1/lifeos/habits/:id/log', wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const habitId = req.params.id;
    const { completed, notes } = req.body || {};
    const logResult = await pool.query(
      `insert into ${habitLogsTable} (user_id, habit_id, completed, notes)
       values ($1, $2, coalesce($3, true), $4)
       returning *`,
      [userId, habitId, completed, notes ?? null]
    );

    await pool.query(
      `update ${habitsTable}
       set streak = coalesce(streak, 0) + case when coalesce($2, true) then 1 else 0 end,
           updated_at = now()
       where id = $1 and user_id = $3`,
      [habitId, completed, userId]
    );

    return json(res, 201, { log: logResult.rows[0] });
  }));

  app.get('/api/v1/lifeos/habits', requireKey, wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const result = await pool.query(
      `select * from ${habitsTable} where user_id = $1 order by created_at desc`,
      [userId]
    );
    return json(res, 200, { habits: result.rows });
  }));

  postProtected('/api/v1/lifeos/journal/voice', wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const transcript = String(req.body?.transcript || '').trim();
    const prompt = `Extract structured journaling insights from this transcript. Return strict JSON with keys commitments, patterns, emotionalSignals, suggestedActions. Transcript: ${transcript}`;
    const raw = await callCouncilMember('lumin', prompt, { userId, route: 'journal/voice' });

    let parsed = safeJson(raw, {});
    if (!parsed || typeof parsed !== 'object') parsed = {};

    return json(res, 200, {
      commitments: parsed.commitments ?? [],
      patterns: parsed.patterns ?? [],
      emotionalSignals: parsed.emotionalSignals ?? [],
      suggestedActions: parsed.suggestedActions ?? []
    });
  }));

  postProtected('/api/v1/lifeos/gratitude', wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const { text, theme } = req.body || {};
    const result = await pool.query(
      `insert into ${gratitudeTable} (user_id, text, theme)
       values ($1, $2, $3)
       returning *`,
      [userId, text ?? null, theme ?? null]
    );
    return json(res, 201, { gratitude: result.rows[0] });
  }));

  app.get('/api/v1/lifeos/gratitude/themes', requireKey, wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const result = await pool.query(
      `select theme, count(*)::int as count
       from ${gratitudeTable}
       where user_id = $1 and theme is not null
       group by theme
       order by count desc, theme asc`,
      [userId]
    );
    return json(res, 200, { themes: result.rows });
  }));

  // Net-worth GET/POST owned by registerLifeOSFinanceRoutes → /api/v1/lifeos/finance/net-worth
  // (phase2 phantom lifeos_net_worth_snapshots removed — use net_worth_snapshots via finance service).

  postProtected('/api/v1/lifeos/future-self/letter', wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const { title, body, tone } = req.body || {};
    const result = await pool.query(
      `insert into ${futureLettersTable} (user_id, title, body, tone)
       values ($1, $2, $3, $4)
       returning *`,
      [userId, title ?? null, body ?? null, tone ?? null]
    );
    return json(res, 201, { letter: result.rows[0] });
  }));

  app.get('/api/v1/lifeos/future-self/letter', requireKey, wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const result = await pool.query(
      `select * from ${futureLettersTable} where user_id = $1 order by created_at desc limit 50`,
      [userId]
    );
    return json(res, 200, { letters: result.rows, letter: result.rows[0] || null });
  }));

  postProtected('/api/v1/lifeos/energy', wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const { energy_level, mood, focus_level, notes, recorded_at } = req.body || {};
    const result = await pool.query(
      `insert into ${energyTable} (user_id, energy_level, mood, focus_level, notes, recorded_at)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [userId, energy_level ?? null, mood ?? null, focus_level ?? null, notes ?? null, recorded_at ?? null]
    );
    return json(res, 201, { energy: result.rows[0] });
  }));

  app.get('/api/v1/lifeos/energy/curve', requireKey, wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const rows = await pool.query(
      `select energy_level, mood, focus_level, notes, recorded_at, created_at
       from ${energyTable}
       where user_id = $1
       order by recorded_at asc nulls last, created_at asc`,
      [userId]
    );

    const prompt = `Summarize the user's energy curve from these records as concise JSON with keys trend, peaks, dips, recommendations. Records: ${JSON.stringify(rows.rows)}`;
    const raw = await callCouncilMember('lumin', prompt, { userId, route: 'energy/curve' });
    const parsed = safeJson(raw, {});
    return json(res, 200, {
      summary: typeof parsed === 'object' && parsed ? parsed : { trend: raw },
      records: rows.rows
    });
  }));

  postProtected('/api/v1/lifeos/important-dates', wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const { label, date, notes, category } = req.body || {};
    const result = await pool.query(
      `insert into ${importantDatesTable} (user_id, label, date, notes, category)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [userId, label ?? null, date ?? null, notes ?? null, category ?? null]
    );
    return json(res, 201, { importantDate: result.rows[0] });
  }));

  app.get('/api/v1/lifeos/important-dates', requireKey, wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const result = await pool.query(
      `select * from ${importantDatesTable} where user_id = $1 order by date asc nulls last, created_at desc`,
      [userId]
    );
    return json(res, 200, { importantDates: result.rows });
  }));

  postProtected('/api/v1/lifeos/learning-queue', wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const { title, source, status, key_insight, notes, priority } = req.body || {};
    const result = await pool.query(
      `insert into ${learningQueueTable} (user_id, title, source, status, key_insight, notes, priority)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [userId, title ?? null, source ?? null, status ?? null, key_insight ?? null, notes ?? null, priority ?? null]
    );
    return json(res, 201, { item: result.rows[0] });
  }));

  app.get('/api/v1/lifeos/learning-queue', requireKey, wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const result = await pool.query(
      `select * from ${learningQueueTable} where user_id = $1 order by priority desc nulls last, created_at desc`,
      [userId]
    );
    return json(res, 200, { items: result.rows });
  }));

  patchProtected('/api/v1/lifeos/learning-queue/:id', wrap(async (req, res) => {
    const userId = await ensureUser(req, res);
    if (!userId) return;

    const { id } = req.params;
    const { status, key_insight } = req.body || {};
    const result = await pool.query(
      `update ${learningQueueTable}
       set status = coalesce($1, status),
           key_insight = coalesce($2, key_insight)
       where id = $3 and user_id = $4
       returning *`,
      [status ?? null, key_insight ?? null, id, userId]
    );

    if (!result.rows.length) {
      return json(res, 404, { error: 'not_found' });
    }
    return json(res, 200, { item: result.rows[0] });
  }));
}

export default registerLifeosPhase2Routes;