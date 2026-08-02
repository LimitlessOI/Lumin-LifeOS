/**
 * SYNOPSIS: Routes for managing story studio rights and privacy.
 * @ssot docs/products/story-studio/PRODUCT_HOME.md
 */
import { setRights, enforcePrivacyMode } from '../services/rightsControl.js';

export function registerRightsRoutes(app, deps) {
  app.post('/rights/set', deps.requireKey, async (req, res) => {
    try {
      const { payload } = req.body;
      if (!payload) {
        deps.logger.warn({ body: req.body }, 'Missing payload for set rights');
        return res.status(400).json({ ok: false, error: 'Missing payload' });
      }
      const result = await setRights(deps, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error, body: req.body }, 'Error setting rights');
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/rights/enforce-privacy', deps.requireKey, async (req, res) => {
    try {
      const { payload } = req.body;
      if (!payload) {
        deps.logger.warn({ body: req.body }, 'Missing payload for enforce privacy mode');
        return res.status(400).json({ ok: false, error: 'Missing payload' });
      }
      const result = await enforcePrivacyMode(deps, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error, body: req.body }, 'Error enforcing privacy mode');
      res.status(500).json({ ok: false, error: error.message });
    }
  });
}