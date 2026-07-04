/**
 * SYNOPSIS: Exports createReceptionistRoutes — routes/receptionist-routes.js.
 */
import express from 'express';
import { createReceptionistService } from '../services/receptionist-service.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function coerceInt(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function toJsonSafe(value) {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return null;
  }
}

export function createReceptionistRoutes(app, ctx) {
  const { pool, requireKey, logger } = ctx || {};
  const router = express.Router();
  const service = createReceptionistService({ pool, callCouncilMember: ctx?.callCouncilMember || (async () => '') });

  router.post('/subscription-webhook', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const eventType = normalizeText(req.body?.event_type);
      const data = req.body?.data;

      if (!eventType) return res.status(400).json({ ok: false, error: 'event_type_required' });
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return res.status(400).json({ ok: false, error: 'data_required' });
      }

      if (logger?.info) {
        logger.info(
          {
            ownerId,
            eventType,
          },
          'receptionist subscription webhook received',
        );
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.post('/agent-provisioning', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const customerId = coerceInt(req.body?.customer_id);
      const businessName = normalizeText(req.body?.business_name);

      if (customerId === null) return res.status(400).json({ ok: false, error: 'customer_id_required' });
      if (!businessName) return res.status(400).json({ ok: false, error: 'business_name_required' });

      const result = await service.createReceptionistAgent({
        ownerId,
        name: `${businessName} Receptionist`,
        input: {
          businessName,
          name: businessName,
        },
        metadata: {
          customer_id: customerId,
          business_name: businessName,
          owner_id: ownerId,
          source: 'agent_provisioning_route',
        },
      });

      const agentId = result?.agent?.id != null ? String(result.agent.id) : '';

      res.json({
        ok: true,
        agent_id: agentId,
      });
    } catch (err) {
      if (err?.status === 400) return res.status(400).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.get('/call-log', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const limit = Math.min(Math.max(coerceInt(req.query?.limit) || 50, 1), 200);
      const { rows } = await pool.query(
        `SELECT *
           FROM receptionist_call_log
          WHERE owner_id = $1
          ORDER BY created_at DESC
          LIMIT $2`,
        [ownerId, limit],
      );

      res.json({
        ok: true,
        logs: rows.map((row) => toJsonSafe(row)),
      });
    } catch (err) {
      if (err?.code === '42P01') {
        return res.status(200).json({ ok: true, logs: [] });
      }
      next(err);
    }
  });

  return router;
}