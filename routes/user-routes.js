/**
 * SYNOPSIS: Exports createUserRoutes — routes/user-routes.js.
 */
import express from 'express';

function toSafeLogger(logger) {
  const noop = () => {};
  if (!logger) {
    return {
      info: noop,
      warn: noop,
      error: noop,
      debug: noop,
    };
  }

  return {
    info: typeof logger.info === 'function' ? logger.info.bind(logger) : noop,
    warn: typeof logger.warn === 'function' ? logger.warn.bind(logger) : noop,
    error: typeof logger.error === 'function' ? logger.error.bind(logger) : noop,
    debug: typeof logger.debug === 'function' ? logger.debug.bind(logger) : noop,
  };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeName(name) {
  const value = String(name || '').trim();
  return value || null;
}

function toUserResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

function readOwnerId(req) {
  return req.lifeosUser?.sub || null;
}

export function createUserRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const log = toSafeLogger(logger);

  router.post('/api/v1/users', requireKey, async (req, res, next) => {
    try {
      const ownerId = readOwnerId(req);
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const email = normalizeEmail(req.body?.email);
      const name = normalizeName(req.body?.name);

      if (!email) return res.status(400).json({ ok: false, error: 'email_required' });
      if (!name) return res.status(400).json({ ok: false, error: 'name_required' });

      const { rows } = await pool.query(
        `INSERT INTO lifeos_users (owner_id, email, name)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, created_at`,
        [ownerId, email, name],
      );

      const user = toUserResponse(rows[0]);
      log.info?.('lifeos_user_created', { user_id: user?.id || null, owner_id: ownerId });

      return res.json({ ok: true, user });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/users/:id', requireKey, async (req, res, next) => {
    try {
      const ownerId = readOwnerId(req);
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const userId = String(req.params.id || '').trim();
      if (!userId) return res.status(400).json({ ok: false, error: 'user_id_required' });

      const { rows } = await pool.query(
        `SELECT id, email, name, created_at
           FROM lifeos_users
          WHERE id = $1
            AND owner_id = $2
          LIMIT 1`,
        [userId, ownerId],
      );

      if (!rows[0]) return res.status(404).json({ ok: false, error: 'user_not_found' });

      return res.json({ ok: true, user: toUserResponse(rows[0]) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}