/**
 * SYNOPSIS: Site Builder publish checkout routes ($49 entry product).
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { Router } from 'express';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import logger from '../services/logger.js';
import {
  createPublishCheckoutSession,
  verifyPublishCheckoutSession,
} from '../services/site-builder-entry-checkout.js';
import { SITE_BUILDER_PRICING } from '../config/site-builder-pricing.js';
import { resolvePreviewsDir } from '../config/site-builder-paths.js';

async function loadProspectContext(pool, clientId) {
  if (!pool) return { businessName: null };
  const result = await pool.query(
    `SELECT business_name, preview_url FROM prospect_sites WHERE client_id = $1 LIMIT 1`,
    [clientId]
  );
  return result.rows[0] || { business_name: null, preview_url: null };
}

async function loadPreviewMeta(clientId) {
  const metaPath = path.join(resolvePreviewsDir(), String(clientId), 'meta.json');
  try {
    return JSON.parse(await fsp.readFile(metaPath, 'utf8'));
  } catch {
    return null;
  }
}

export function createSiteBuilderCheckoutRoutes(app, { pool, baseUrl } = {}) {
  const router = Router();

  router.get('/publish/pricing', (_req, res) => {
    res.json({
      ok: true,
      publish: SITE_BUILDER_PRICING.publish,
      carePlan: SITE_BUILDER_PRICING.carePlan,
    });
  });

  router.get('/publish/checkout', async (req, res) => {
    try {
      const clientId = String(req.query.clientId || req.query.id || '').trim();
      if (!clientId || !/^[\w-]+$/.test(clientId)) {
        return res.status(400).json({ ok: false, error: 'clientId required' });
      }

      const meta = await loadPreviewMeta(clientId);
      if (!meta) {
        return res.status(404).json({ ok: false, error: 'Preview not found' });
      }

      const prospect = await loadProspectContext(pool, clientId);
      const businessName = meta.businessInfo?.businessName || prospect.business_name || 'your business';

      const checkout = await createPublishCheckoutSession({
        clientId,
        businessName,
        baseUrl,
        pool,
      });

      if (!checkout.ok) {
        return res.status(checkout.error?.includes('Stripe') ? 503 : 400).json(checkout);
      }

      if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
        return res.json(checkout);
      }

      return res.redirect(302, checkout.url);
    } catch (err) {
      logger.error('[SITE-CHECKOUT] checkout error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/publish/success', async (req, res) => {
    try {
      const clientId = String(req.query.clientId || '').trim();
      const sessionId = String(req.query.session_id || '').trim();

      if (!clientId || !sessionId) {
        return res.status(400).send('Missing payment confirmation parameters.');
      }

      const result = await verifyPublishCheckoutSession({ sessionId, clientId, pool });
      if (!result.ok) {
        return res.status(400).send(`Payment verification failed: ${result.error}`);
      }

      const previewUrl = `${String(baseUrl || '').replace(/\/$/, '')}/previews/${encodeURIComponent(clientId)}/`;
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>You're live — Site Builder</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 520px; margin: 48px auto; padding: 0 20px; color: #111; }
    h1 { font-size: 1.5rem; }
    a { color: #6d28d9; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-top: 16px; }
  </style>
</head>
<body>
  <h1>Payment received — thank you</h1>
  <p>Your publish order (${SITE_BUILDER_PRICING.publish.display}) is confirmed. We'll finish domain setup and handoff next.</p>
  <div class="card">
    <p><strong>Preview:</strong> <a href="${previewUrl}">Open your site</a></p>
    <p><strong>Next:</strong> Reply to our email if you want the care plan (${SITE_BUILDER_PRICING.carePlan.display}) or add-ons from your editor sidebar.</p>
  </div>
</body>
</html>`);
    } catch (err) {
      logger.error('[SITE-CHECKOUT] success handler error', { error: err.message });
      return res.status(500).send('Something went wrong confirming your payment.');
    }
  });

  app.use('/api/v1/sites', router);
  logger.info('[SITE-CHECKOUT] Publish checkout routes mounted at /api/v1/sites/publish/*');
}

export default createSiteBuilderCheckoutRoutes;
