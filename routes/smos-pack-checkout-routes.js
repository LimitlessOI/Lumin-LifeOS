/**
 * SYNOPSIS: SocialMediaOS $49 pack checkout API (public create + verify).
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import {
  createSmosPackCheckoutSession,
  verifySmosPackCheckoutSession,
} from '../services/smos-pack-checkout.js';
import { SMOS_PRICING, getSmosPackOfferSummary } from '../config/smos-pricing.js';

export function registerSmosPackCheckoutRoutes(app, deps = {}) {
  const { pool, baseUrl, logger = console } = deps;
  const resolvedBase =
    baseUrl ||
    process.env.PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    '';

  app.get('/api/v1/marketing/pack/pricing', (_req, res) => {
    res.json({
      ok: true,
      pack: SMOS_PRICING.pack,
      offer: getSmosPackOfferSummary(),
    });
  });

  app.post('/api/v1/marketing/pack/checkout', async (req, res) => {
    try {
      const sessionId = String(req.body?.session_id || req.body?.sessionId || '').trim();
      const ownerId = String(req.body?.owner_id || req.body?.ownerId || 'adam').trim();
      const result = await createSmosPackCheckoutSession({
        sessionId,
        ownerId,
        baseUrl: resolvedBase,
        pool,
      });
      if (!result.ok) {
        const status = /not found/i.test(result.error || '') ? 404 : 400;
        return res.status(status).json(result);
      }
      return res.status(200).json(result);
    } catch (error) {
      logger?.error?.('[SMOS-CHECKOUT] create failed', { error: error.message });
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get('/api/v1/marketing/pack/verify', async (req, res) => {
    try {
      const checkoutSessionId = String(req.query.checkout_session_id || req.query.session_id || '').trim();
      const expectedMarketingSessionId = String(req.query.marketing_session_id || req.query.session || '').trim();
      const result = await verifySmosPackCheckoutSession({
        checkoutSessionId,
        expectedMarketingSessionId: expectedMarketingSessionId || undefined,
      });
      const status = result.ok ? 200 : 402;
      return res.status(status).json(result);
    } catch (error) {
      logger?.error?.('[SMOS-CHECKOUT] verify failed', { error: error.message });
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  logger?.info?.('SMOS pack checkout routes registered at /api/v1/marketing/pack/*');
}

export default registerSmosPackCheckoutRoutes;
