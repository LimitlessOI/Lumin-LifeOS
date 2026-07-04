/**
 * SYNOPSIS: Exports createGamePublisherRoutes — routes/game-publisher-routes.js.
 */
import express from 'express';

export function createGamePublisherRoutes(app, ctx) {
  const { pool, requireKey, logger } = ctx || {};
  const router = express.Router();

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_required');
  }
  if (typeof requireKey !== 'function') {
    throw new Error('requireKey_required');
  }

  async function buildGame({ description, generated = false }) {
    const ownerId = null;
    if (!ownerId) return null;
    return null;
  }

  async function insertGame({ ownerId, title, description, playCount = 0 }) {
    const { rows } = await pool.query(
      `INSERT INTO games (owner_id, title, description, play_count)
       VALUES ($1, $2, $3, $4)
       RETURNING game_id, title, description, play_count`,
      [ownerId, title, description, playCount],
    );
    return rows[0];
  }

  router.post('/build', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const description = String(req.body?.description || '').trim();
      if (!description) return res.status(400).json({ ok: false, error: 'description_required' });

      const title = `Game: ${description.slice(0, 40)}`;
      const { rows } = await pool.query(
        `INSERT INTO games (owner_id, title, description, play_count)
         VALUES ($1, $2, $3, 0)
         RETURNING game_id, title, description, play_count`,
        [ownerId, title, description],
      );

      logger?.info?.('[GAMES] build route created game', { ownerId, gameId: rows[0]?.game_id });
      return res.json({ ok: true, data: rows[0] });
    } catch (err) {
      next(err);
    }
  });

  router.post('/generate', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const description = String(req.body?.description || '').trim();
      if (!description) return res.status(400).json({ ok: false, error: 'description_required' });

      const title = `Generated Game: ${description.slice(0, 32)}`;
      const { rows } = await pool.query(
        `INSERT INTO games (owner_id, title, description, play_count)
         VALUES ($1, $2, $3, 0)
         RETURNING game_id, title, description, play_count`,
        [ownerId, title, description],
      );

      logger?.info?.('[GAMES] generate route created game', { ownerId, gameId: rows[0]?.game_id });
      return res.json({ ok: true, data: rows[0] });
    } catch (err) {
      next(err);
    }
  });

  router.get('/list', async (_req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT game_id, title, description, play_count
           FROM games
          ORDER BY created_at DESC, game_id DESC`,
        [],
      );

      return res.json({ ok: true, data: rows.map((row) => ({
        game_id: row.game_id,
        title: row.title,
        description: row.description,
        play_count: row.play_count,
      })) });
    } catch (err) {
      next(err);
    }
  });

  if (app && typeof app.use === 'function') {
    app.use('/api/v1/games', router);
  }

  return router;
}