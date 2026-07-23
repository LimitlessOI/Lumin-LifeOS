/**
 * SYNOPSIS: Site Builder beta publish checkout routes ($45 entry + 2 mo management).
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { Router } from 'express';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import logger from '../services/logger.js';
import {
  createPublishCheckoutSession,
  verifyPublishCheckoutSession,
  redeemPublishCompCode,
  createUpsellCheckoutSession,
  verifyUpsellCheckoutSession,
} from '../services/site-builder-entry-checkout.js';
import { SITE_BUILDER_PRICING, getBetaPublishOfferSummary } from '../config/site-builder-pricing.js';
import { resolveRequestPublicBase } from '../services/site-builder-public-base.js';

async function loadProspectContext(pool, clientId) {
  if (!pool) return { businessName: null };
  const result = await pool.query(
    `SELECT business_name, preview_url FROM prospect_sites WHERE client_id = $1 LIMIT 1`,
    [clientId]
  );
  return result.rows[0] || { business_name: null, preview_url: null };
}

async function loadPreviewMeta(clientId, pool = null) {
  const metaPath = path.join(process.cwd(), 'public/previews', String(clientId), 'meta.json');
  try {
    return JSON.parse(await fsp.readFile(metaPath, 'utf8'));
  } catch {
    if (!pool) return null;
    try {
      const result = await pool.query(
        `SELECT metadata FROM prospect_sites WHERE client_id = $1 LIMIT 1`,
        [clientId]
      );
      const meta = result.rows[0]?.metadata?.previewMeta;
      if (meta && typeof meta === 'object') return meta;
      const html = result.rows[0]?.metadata?.previewHtml;
      if (html) {
        return {
          clientId,
          businessInfo: result.rows[0]?.metadata?.businessInfo || { businessName: null },
          previewUrl: result.rows[0]?.metadata?.previewUrl || null,
        };
      }
    } catch {
      return null;
    }
    return null;
  }
}

export function createSiteBuilderCheckoutRoutes(app, { pool, baseUrl } = {}) {
  const router = Router();

  router.get('/publish/pricing', (_req, res) => {
    res.json({
      ok: true,
      beta: SITE_BUILDER_PRICING.beta === true,
      publish: SITE_BUILDER_PRICING.publish,
      carePlan: SITE_BUILDER_PRICING.carePlan,
      offer: getBetaPublishOfferSummary(),
      discountCodesAccepted: true,
    });
  });

  function renderCheckoutPage({
    clientId,
    businessName,
    priceDisplay,
    careMonths,
    previewUrl,
    payUrl,
    errorMessage = '',
  }) {
    const err = errorMessage
      ? `<p class="err">${String(errorMessage).replace(/</g, '&lt;')}</p>`
      : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Checkout — Site Builder</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:440px;margin:48px auto;padding:0 20px;color:#0f172a;background:linear-gradient(180deg,#f8fafc 0%,#fff 45%);min-height:100vh}
    h1{font-size:1.45rem;margin:0 0 .4rem}
    .sub{color:#64748b;margin:0 0 1.25rem;line-height:1.45}
    .card{border:1px solid #e2e8f0;border-radius:14px;padding:1.25rem;background:#fff;box-shadow:0 8px 30px rgba(15,23,42,.06)}
    .price{font-size:2rem;font-weight:700;margin:.25rem 0}
    .note{font-size:.9rem;color:#475569;margin:0 0 1rem}
    label{display:block;font-size:.8rem;font-weight:600;color:#475569;margin:1rem 0 .35rem}
    input{width:100%;box-sizing:border-box;padding:.7rem .85rem;border:1px solid #cbd5e1;border-radius:10px;font-size:1rem}
    .actions{display:flex;flex-direction:column;gap:.65rem;margin-top:1.1rem}
    .btn{display:block;text-align:center;text-decoration:none;border:0;border-radius:10px;padding:.85rem 1rem;font-weight:700;font-size:1rem;cursor:pointer}
    .btn-primary{background:#7c3aed;color:#fff}
    .btn-secondary{background:#f1f5f9;color:#0f172a}
    .err{color:#b91c1c;font-size:.9rem;margin:.75rem 0 0}
    a.back{display:inline-block;margin-top:1.25rem;color:#64748b;font-size:.9rem}
  </style>
</head>
<body>
  <h1>Publish ${String(businessName || 'your site').replace(/</g, '&lt;')}</h1>
  <p class="sub">Review your order, then continue to secure payment.</p>
  <div class="card">
    <div class="price">${priceDisplay}</div>
    <p class="note">Includes the first ${careMonths} months of site management. After that, care is optional.</p>
    <form method="get" action="/api/v1/sites/publish/checkout">
      <input type="hidden" name="clientId" value="${String(clientId).replace(/"/g, '')}" />
      <input type="hidden" name="pay" value="1" />
      <label for="discount">Discount code</label>
      <input id="discount" name="code" type="text" autocomplete="off" autocapitalize="characters" placeholder="Enter code" />
      ${err}
      <div class="actions">
        <button class="btn btn-primary" type="submit">Continue to payment</button>
        <a class="btn btn-secondary" href="${payUrl}">Pay ${priceDisplay} without a code</a>
      </div>
    </form>
  </div>
  <a class="back" href="${previewUrl}">← Back to preview</a>
</body>
</html>`;
  }

  router.get('/publish/checkout', async (req, res) => {
    try {
      const clientId = String(req.query.clientId || req.query.id || '').trim();
      if (!clientId || !/^[\w-]+$/.test(clientId)) {
        return res.status(400).json({ ok: false, error: 'clientId required' });
      }

      const meta = await loadPreviewMeta(clientId, pool);
      if (!meta) {
        return res.status(404).json({ ok: false, error: 'Preview not found' });
      }

      const prospect = await loadProspectContext(pool, clientId);
      const businessName = meta.businessInfo?.businessName || prospect.business_name || 'your business';
      const effectiveBase = resolveRequestPublicBase(req, baseUrl);
      const code = String(req.query.code || req.query.promo || req.query.discount || '').trim();
      const wantsJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
      const skipPage = String(req.query.pay || '') === '1' || wantsJson;

      if (code) {
        const redeemed = await redeemPublishCompCode({
          clientId,
          code,
          pool,
          businessName,
        });
        if (!redeemed.ok) {
          if (wantsJson) return res.status(400).json(redeemed);
          const previewUrl = `${effectiveBase}/previews/${encodeURIComponent(clientId)}/`;
          const payUrl = `/api/v1/sites/publish/checkout?clientId=${encodeURIComponent(clientId)}&pay=1`;
          res.set('Content-Type', 'text/html; charset=utf-8');
          return res.status(400).send(renderCheckoutPage({
            clientId,
            businessName,
            priceDisplay: SITE_BUILDER_PRICING.publish.display,
            careMonths: SITE_BUILDER_PRICING.carePlan.includedMonthsOnPublish || 2,
            previewUrl,
            payUrl,
            errorMessage: redeemed.error || 'That discount code did not work.',
          }));
        }
        const successUrl = `${effectiveBase}/api/v1/sites/publish/success?clientId=${encodeURIComponent(clientId)}&session_id=${encodeURIComponent(redeemed.sessionId)}`;
        if (wantsJson) {
          return res.json({ ...redeemed, url: successUrl });
        }
        return res.redirect(302, successUrl);
      }

      if (!skipPage) {
        const previewUrl = `${effectiveBase}/previews/${encodeURIComponent(clientId)}/`;
        const payUrl = `/api/v1/sites/publish/checkout?clientId=${encodeURIComponent(clientId)}&pay=1`;
        res.set('Content-Type', 'text/html; charset=utf-8');
        return res.send(renderCheckoutPage({
          clientId,
          businessName,
          priceDisplay: SITE_BUILDER_PRICING.publish.display,
          careMonths: SITE_BUILDER_PRICING.carePlan.includedMonthsOnPublish || 2,
          previewUrl,
          payUrl,
        }));
      }

      const checkout = await createPublishCheckoutSession({
        clientId,
        businessName,
        baseUrl: effectiveBase,
        pool,
        templateTier: String(req.query.templateTier || '').trim(),
        selectedDesign: String(req.query.selectedDesign || '').trim(),
      });

      if (!checkout.ok) {
        return res.status(checkout.error?.includes('Stripe') ? 503 : 400).json(checkout);
      }

      if (wantsJson) {
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

      const previewUrl = `${resolveRequestPublicBase(req, baseUrl)}/previews/${encodeURIComponent(clientId)}/`;
      const months = result.careIncludedMonths || SITE_BUILDER_PRICING.carePlan.includedMonthsOnPublish || 2;
      const discounted = result.free === true || Number(result.dealValue) === 0;
      const headline = discounted
        ? 'Discount applied — you are published'
        : 'Payment received — welcome to the beta';
      const bodyCopy = discounted
        ? `Your discount code was applied. Your first ${months} months of site management are included — same care path as a paid beta publish.`
        : `Your ${SITE_BUILDER_PRICING.publish.display} beta-tester publish is confirmed. You got this rate because we're still testing with real practices — your feedback helps us finish the product. Your first ${months} months of site management are included.`;
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${discounted ? 'Discount applied' : "You're in beta"} — Site Builder</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 520px; margin: 48px auto; padding: 0 20px; color: #111; background: linear-gradient(180deg, #ecfeff 0%, #fff 40%); min-height: 100vh; }
    h1 { font-size: 1.6rem; }
    a { color: #0f766e; }
    .card { border: 1px solid #99f6e4; border-radius: 12px; padding: 20px; margin-top: 16px; background: #fff; }
  </style>
</head>
<body>
  <h1>${headline}</h1>
  <p>${bodyCopy}</p>
  <div class="card">
    <p><strong>Preview:</strong> <a href="${previewUrl}">Open your site</a></p>
    <p><strong>Included:</strong> ${months} months of site management (then ${SITE_BUILDER_PRICING.carePlan.display} if you continue).</p>
    <p><strong>Next:</strong> We'll finish domain setup and handoff. Reply anytime with what you like or don't — honest notes beat polite silence.</p>
  </div>
</body>
</html>`);
    } catch (err) {
      logger.error('[SITE-CHECKOUT] success handler error', { error: err.message });
      return res.status(500).send('Something went wrong confirming your payment.');
    }
  });

  router.get('/upsell/pricing', (_req, res) => {
    res.json({
      ok: true,
      templates: SITE_BUILDER_PRICING.templates,
      colors: SITE_BUILDER_PRICING.colors,
    });
  });

  router.get('/upsell/checkout', async (req, res) => {
    try {
      const clientId = String(req.query.clientId || req.query.id || '').trim();
      const kind = String(req.query.kind || '').trim();
      if (!clientId || !/^[\w-]+$/.test(clientId)) {
        return res.status(400).json({ ok: false, error: 'clientId required' });
      }
      if (!['template-additional', 'template-custom', 'color-custom'].includes(kind)) {
        return res.status(400).json({ ok: false, error: 'kind must be template-additional, template-custom, or color-custom' });
      }

      const meta = await loadPreviewMeta(clientId, pool);
      if (!meta) {
        return res.status(404).json({ ok: false, error: 'Preview not found' });
      }

      const prospect = await loadProspectContext(pool, clientId);
      const businessName = meta.businessInfo?.businessName || prospect.business_name || 'your business';
      const effectiveBase = resolveRequestPublicBase(req, baseUrl);

      const checkout = await createUpsellCheckoutSession({
        clientId,
        businessName,
        kind,
        baseUrl: effectiveBase,
        pool,
        note: String(req.query.note || '').slice(0, 400),
      });

      if (!checkout.ok) {
        return res.status(checkout.error?.includes('Stripe') ? 503 : 400).json(checkout);
      }

      if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
        return res.json(checkout);
      }

      return res.redirect(302, checkout.url);
    } catch (err) {
      logger.error('[SITE-CHECKOUT] upsell checkout error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/upsell/verify', async (req, res) => {
    try {
      const clientId = String(req.query.clientId || '').trim();
      const sessionId = String(req.query.upsell_session_id || req.query.session_id || '').trim();
      const kind = String(req.query.upsell_kind || req.query.kind || '').trim();
      if (!clientId || !sessionId) {
        return res.status(400).json({ ok: false, error: 'clientId and session_id required' });
      }

      const result = await verifyUpsellCheckoutSession({ sessionId, clientId, kind, pool });
      return res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      logger.error('[SITE-CHECKOUT] upsell verify error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.use('/api/v1/sites', router);
  logger.info('[SITE-CHECKOUT] Publish + upsell checkout routes mounted at /api/v1/sites/publish/* and /api/v1/sites/upsell/*');
}

export default createSiteBuilderCheckoutRoutes;