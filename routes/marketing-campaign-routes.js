/**
 * SYNOPSIS: API routes for generating and retrieving marketing campaign assets.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import { generateCampaignAssets, getCampaignAssetsBySessionId } from '../services/marketing-campaign-generator.js';

export function registerMarketingCampaignRoutes(app, deps) {
  app.post('/api/v1/marketingos/campaign/generate', deps.requireKey, async (req, res, next) => {
    try {
      const payload = req.body;
      const result = await generateCampaignAssets(deps, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in marketing-campaign-routes generate route');
      next(error);
    }
  });

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
      deps.logger.error({ error }, 'Error in marketing-campaign-routes get assets route');
      next(error);
    }
  });
}