/**
 * SYNOPSIS: Exports createFutureRoutes — routes/future-self-simulator-routes.js.
 */
import express from 'express';

function safeLog(logger, level, message, meta) {
  try {
    if (!logger || typeof logger[level] !== 'function') return;
    logger[level](meta ? { message, ...meta } : message);
  } catch {
    // non-fatal
  }
}

export function createFutureRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/kids-os/future-self', requireKey, async (req, res, next) => {
    try {
      const body = req.body || {};
      const user = body.user ?? body.user_id ?? body.userId;
      const domain = body.domain;
      const currentBaseline = body.currentBaseline ?? body.current_baseline;
      const commitmentLevel = body.commitmentLevel ?? body.commitment_level;
      const targetHorizonDays = body.targetHorizonDays ?? body.target_horizon_days;

      if (!user) return res.status(400).json({ ok: false, error: 'user_required' });
      if (!domain) return res.status(400).json({ ok: false, error: 'domain_required' });
      if (!currentBaseline || typeof currentBaseline !== 'object') {
        return res.status(400).json({ ok: false, error: 'currentBaseline_required' });
      }
      if (!commitmentLevel || typeof commitmentLevel !== 'object') {
        return res.status(400).json({ ok: false, error: 'commitmentLevel_required' });
      }
      if (targetHorizonDays == null) {
        return res.status(400).json({ ok: false, error: 'targetHorizonDays_required' });
      }

      const userId = Number.isInteger(user) ? user : Number.parseInt(String(user), 10);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ ok: false, error: 'user_invalid' });
      }

      const baselineLevel = Number(currentBaseline.level);
      const horizonDays = Number(targetHorizonDays);
      const minutesPerDay = Number(commitmentLevel.minutesPerDay);
      const sessionsPerWeek = Number(commitmentLevel.sessionsPerWeek ?? 7);

      if (!Number.isFinite(baselineLevel)) {
        return res.status(400).json({ ok: false, error: 'currentBaseline.level_required' });
      }
      if (!Number.isFinite(minutesPerDay)) {
        return res.status(400).json({ ok: false, error: 'commitmentLevel.minutesPerDay_required' });
      }
      if (!Number.isFinite(horizonDays)) {
        return res.status(400).json({ ok: false, error: 'targetHorizonDays_invalid' });
      }

      const projection = {
        domain: String(domain),
        currentBaseline: {
          ...currentBaseline,
          level: baselineLevel,
        },
        commitmentLevel: {
          ...commitmentLevel,
          minutesPerDay,
          sessionsPerWeek: Number.isFinite(sessionsPerWeek) ? sessionsPerWeek : 7,
        },
        targetHorizonDays: horizonDays,
      };

      const result = await pool.query(
        `SELECT create_future_self_projection($1::jsonb) AS data`,
        [JSON.stringify({ userId, ...projection })],
      ).catch(async () => {
        const { rows } = await pool.query(
          `INSERT INTO future_self_requests (user_id, payload)
           VALUES ($1, $2)
           RETURNING payload AS data`,
          [userId, JSON.stringify(projection)],
        );
        return { rows };
      });

      const data = result?.rows?.[0]?.data ?? result?.rows?.[0]?.payload ?? result?.rows?.[0] ?? projection;
      safeLog(logger, 'info', 'future-self projection requested', { userId, domain: String(domain) });

      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  });

  return router;
}