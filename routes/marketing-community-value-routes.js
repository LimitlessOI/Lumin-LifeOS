/**
 * SYNOPSIS: Registers MarketingCommunityValueRoutes routes/handlers (routes/marketing-community-value-routes.js).
 */
export function registerMarketingCommunityValueRoutes(app, deps = {}) {
  const pool = deps.pool;
  const requireKey = deps.requireKey;
  const callCouncilMember = deps.callCouncilMember;
  const logger = deps.logger || console;

  if (!app || typeof app.post !== 'function') {
    throw new Error('registerMarketingCommunityValueRoutes requires an Express app with post()');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerMarketingCommunityValueRoutes requires deps.pool with query()');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('registerMarketingCommunityValueRoutes requires deps.callCouncilMember');
  }

  const routePath = '/api/v1/marketing/community/draft-reply';

  app.post(routePath, requireKey, async (req, res) => {
    try {
      const body = req && req.body && typeof req.body === 'object' ? req.body : {};
      const platform = typeof body.platform === 'string' ? body.platform.trim() : '';
      const threadTitle = typeof body.threadTitle === 'string' ? body.threadTitle.trim() : '';
      const threadBody = typeof body.threadBody === 'string' ? body.threadBody.trim() : '';
      const productAngle = typeof body.productAngle === 'string' ? body.productAngle.trim() : '';
      const tone = typeof body.tone === 'string' ? body.tone.trim() : '';

      if (!platform || !threadTitle || !threadBody) {
        return res.status(400).json({
          ok: false,
          error: 'platform, threadTitle, and threadBody are required',
        });
      }

      const prompt = [
        'You are drafting a value-first community outreach reply.',
        'Write a concise, helpful reply that contributes real value before mentioning anything promotional.',
        'Avoid hype, avoid spam, avoid hard selling.',
        'Keep it specific to the thread and natural for the platform.',
        '',
        `Platform: ${platform}`,
        `Tone: ${tone || 'helpful, concise, human'}`,
        `Thread title: ${threadTitle}`,
        `Thread body: ${threadBody}`,
        productAngle ? `Product angle: ${productAngle}` : '',
        '',
        'Return only the draft reply text.',
      ]
        .filter(Boolean)
        .join('\n');

      const draft = await callCouncilMember(
        'marketing-community-value-drafter',
        prompt,
        { platform, threadTitle, tone, productAngle }
      );

      try {
        await pool.query(
          `
            INSERT INTO marketing_content (
              content_type,
              content_data
            )
            VALUES ($1, $2::jsonb)
            RETURNING id, created_at
          `,
          [
            'community_draft_reply',
            JSON.stringify({
              platform,
              threadTitle,
              threadBody,
              productAngle: productAngle || null,
              tone: tone || null,
              draft,
              source: 'api/v1/marketing/community/draft-reply',
            }),
          ]
        );
      } catch (dbErr) {
        logger.warn?.('marketing community draft reply persistence failed', {
          error: dbErr && dbErr.message ? dbErr.message : String(dbErr),
        });
      }

      return res.status(200).json({
        ok: true,
        platform,
        draft,
      });
    } catch (error) {
      logger.error?.('marketing community draft reply failed', {
        error: error && error.message ? error.message : String(error),
      });
      return res.status(500).json({
        ok: false,
        error: 'Failed to create community reply draft',
      });
    }
  });
}

export default registerMarketingCommunityValueRoutes;