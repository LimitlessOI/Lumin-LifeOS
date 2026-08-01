/**
 * SYNOPSIS: API routes for generating and retrieving marketing campaign assets.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import { generateCampaignAssets, getCampaignAssetsBySessionId } from '../services/marketingCampaignGenerator.js';

export function registerMarketingCampaignRoutes(app, deps) {
  /**
   * SYNOPSIS: Generates marketing campaign assets based on the provided payload.
   * @ssot docs/products/marketingos/PRODUCT_HOME.md
   */
  app.post('/api/v1/marketingos/campaign/generate', deps.requireKey, async (req, res, next) => {
    try {
      const payload = req.body;
      const result = await generateCampaignAssets(deps, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in POST /api/v1/marketingos/campaign/generate route');
      next(error);
    }
  });

  /**
   * SYNOPSIS: Retrieves marketing campaign assets by session ID.
   * @ssot docs/products/marketingos/PRODUCT_HOME.md
   */
  app.get('/api/v1/marketingos/campaign/assets/:sessionId', deps.requireKey, async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const result = await getCampaignAssetsBySessionId(deps, sessionId);
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ message: 'Campaign assets not found for the given session ID.' });
      }
    } catch (error) {
      deps.logger.error({ error }, 'Error in GET /api/v1/marketingos/campaign/assets/:sessionId route');
      next(error);
    }
  });
}