/**
 * SYNOPSIS: Exports createCalendarRoutes — routes/calendar-routes.js.
 */
import express from 'express';

function isDateLike(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function normalizeDate(value) {
  return String(value || '').trim();
}

function validateBody(body) {
  const eventName = body?.event_name;
  const date = body?.date;
  const description = body?.description;

  if (typeof eventName !== 'string' || !eventName.trim()) return 'event_name_required';
  if (typeof date !== 'string' || !date.trim()) return 'date_required';
  if (!isDateLike(date)) return 'date_invalid';
  if (typeof description !== 'string' || !description.trim()) return 'description_required';

  return null;
}

export function createCalendarRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/events', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const validationError = validateBody(req.body || {});
      if (validationError) return res.status(400).json({ error: validationError });

      const eventName = String(req.body.event_name).trim();
      const date = normalizeDate(req.body.date);
      const description = String(req.body.description).trim();

      const { rows } = await pool.query(
        `INSERT INTO calendar_events (owner_id, event_name, date, description)
         VALUES ($1, $2, $3::date, $4)
         RETURNING *`,
        [ownerId, eventName, date, description],
      );

      return res.json({ ok: true, data: rows[0] });
    } catch (err) {
      logger?.error?.({ err }, 'calendar_events_create_failed');
      next(err);
    }
  });

  router.get('/events', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { rows } = await pool.query(
        `SELECT *
           FROM calendar_events
          WHERE owner_id = $1
          ORDER BY date ASC, created_at DESC`,
        [ownerId],
      );

      return res.json({ ok: true, data: rows });
    } catch (err) {
      logger?.error?.({ err }, 'calendar_events_list_failed');
      next(err);
    }
  });

  return router;
}