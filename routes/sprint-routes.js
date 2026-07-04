/**
 * SYNOPSIS: Exports createSprintRoutes — routes/sprint-routes.js.
 */
import express from 'express';

function normalizeText(value) {
  return String(value || '').trim();
}

function requireOwnerId(req, res) {
  const ownerId = req.lifeosUser?.sub || null;
  if (!ownerId) {
    res.status(401).json({ error: 'jwt_required' });
    return null;
  }
  return ownerId;
}

function toJsonResponse(row) {
  if (!row) return null;
  return row;
}

export function createSprintRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/submit', requireKey, async (req, res, next) => {
    try {
      const ownerId = requireOwnerId(req, res);
      if (!ownerId) return;

      const assetDescription = normalizeText(req.body?.asset_description);
      const customerEmail = normalizeText(req.body?.customer_email);
      const offerType = normalizeText(req.body?.offer_type);

      if (!assetDescription) return res.status(400).json({ ok: false, error: 'asset_description_required' });
      if (!customerEmail) return res.status(400).json({ ok: false, error: 'customer_email_required' });
      if (!offerType) return res.status(400).json({ ok: false, error: 'offer_type_required' });

      const { rows } = await pool.query(
        `INSERT INTO customer_briefs
           (owner_id, asset_description, customer_email, offer_type)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [ownerId, assetDescription, customerEmail, offerType],
      );

      const data = toJsonResponse(rows[0]);
      logger?.info?.(
        {
          owner_id: ownerId,
          brief_id: data?.id ?? null,
        },
        'sprint brief submitted',
      );

      return res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  });

  return router;
}