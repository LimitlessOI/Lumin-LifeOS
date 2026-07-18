/**
 * SYNOPSIS: Value-first community draft API for MarketingOS outreach.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import createCommunityValueDrafter from '../services/marketing-community-value.js';

export function registerMarketingCommunityValueRoutes(app, deps = {}) {
  const requireKey = deps.requireKey;
  const callCouncilMember = deps.callCouncilMember;
  const logger = deps.logger || console;

  if (!app || typeof app.post !== 'function') {
    throw new Error('registerMarketingCommunityValueRoutes requires an Express app with post()');
  }
  if (typeof requireKey !== 'function') {
    throw new Error('registerMarketingCommunityValueRoutes requires deps.requireKey');
  }

  const drafter = createCommunityValueDrafter({ callCouncilMember });

  app.post('/api/v1/marketing/community/draft-reply', requireKey, async (req, res) => {
    try {
      const body = req?.body && typeof req.body === 'object' ? req.body : {};
      const platform = typeof body.platform === 'string' ? body.platform.trim() : '';
      const threadTitle = typeof body.threadTitle === 'string'
        ? body.threadTitle.trim()
        : (typeof body.thread_title === 'string' ? body.thread_title.trim() : '');
      const threadBody = typeof body.threadBody === 'string'
        ? body.threadBody.trim()
        : (typeof body.thread_body === 'string' ? body.thread_body.trim() : '');
      const productAngle = typeof body.productAngle === 'string'
        ? body.productAngle.trim()
        : (typeof body.product_angle === 'string' ? body.product_angle.trim() : '');
      const tone = typeof body.tone === 'string' ? body.tone.trim() : '';

      if (!platform || !threadTitle || !threadBody) {
        return res.status(400).json({
          ok: false,
          error: 'platform, threadTitle, and threadBody are required',
        });
      }

      const draft = await drafter.draftReply({
        platform,
        threadTitle,
        threadBody,
        productAngle,
        tone,
      });

      return res.status(200).json({
        ok: true,
        platform,
        ...draft,
        soft_cta_url: 'https://lumin-web-production-e3a9.up.railway.app/site-builder',
      });
    } catch (error) {
      logger.error?.('marketing community draft reply failed', {
        error: error?.message || String(error),
      });
      return res.status(500).json({
        ok: false,
        error: 'Failed to create community reply draft',
      });
    }
  });
}

export default registerMarketingCommunityValueRoutes;
