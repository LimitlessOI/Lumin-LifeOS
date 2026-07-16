/**
 * SYNOPSIS: SocialMediaOS paid content-pack Stripe checkout routes.
 * @ssot docs/products/marketingos/socialmediaos/PRODUCT_HOME.md
 */
import express from 'express';
import { resolvePublicBaseUrl } from '../config/public-origin.js';
import { createMarketingOSFactory } from '../services/socialmediaos-service.js';

export function createSmosContentPackCheckoutRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const socialMediaOS = createMarketingOSFactory({ pool, logger });
  const baseUrl = resolvePublicBaseUrl(
    process.env.SMOS_BASE_URL,
    process.env.PUBLIC_BASE_URL,
    process.env.BASE_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '',
  ) || `http://localhost:${process.env.PORT || 8080}`;

  const getOwnerId = (req, res, next) => {
    const ownerId = req.lifeosUser?.sub || null;
    if (!ownerId) {
      return res.status(401).json({ error: 'jwt_required' });
    }
    req.ownerId = ownerId;
    next();
  };

  router.get('/content-pack/pricing', requireKey, getOwnerId, async (_req, res, next) => {
    try {
      res.json(socialMediaOS.getContentPackPricing());
    } catch (err) {
      next(err);
    }
  });

  router.post('/content-pack/checkout', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { sessionId, packId } = req.body || {};
      const result = await socialMediaOS.createContentPackCheckout({
        ownerId: req.ownerId,
        baseUrl,
        sessionId,
        packId,
      });
      res.json(result);
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 503) return res.status(503).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.get('/content-pack/success', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const contentPackId = String(req.query.contentPackId || '');
      const checkoutSessionId = String(req.query.session_id || '');
      if (!contentPackId || !checkoutSessionId) {
        return res.status(400).send('Missing payment confirmation parameters.');
      }
      const result = await socialMediaOS.verifyContentPackCheckout({
        ownerId: req.ownerId,
        contentPackId,
        checkoutSessionId,
      });
      if (!result.ok) {
        return res.status(400).send(`Payment verification failed: ${result.paymentStatus}`);
      }
      res.redirect(302, `${baseUrl}/overlay/marketing-for-you.html?paid=1&pack=${encodeURIComponent(contentPackId)}`);
    } catch (err) {
      next(err);
    }
  });

  router.get('/content-pack/cancel', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const contentPackId = String(req.query.contentPackId || '');
      res.redirect(302, `${baseUrl}/overlay/marketing-for-you.html?canceled=1&pack=${encodeURIComponent(contentPackId)}`);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
