/**
 * SYNOPSIS: HTTP route module — Command Center Mode Routes.
 */
import { setMode, getMode } from '../services/builder-runtime-mode-service.js';

function registerCommandCenterModeRoutes(app, deps = {}) {
  const db = deps.db || deps.pool;
  const callCouncilMember = deps.callCouncilMember;

  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerCommandCenterModeRoutes requires an Express app with get/post methods');
  }
  if (!db || typeof db.query !== 'function') {
    throw new Error('registerCommandCenterModeRoutes requires deps.db or deps.pool with query()');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('registerCommandCenterModeRoutes requires deps.callCouncilMember');
  }

  app.get('/api/v1/lifeos/command-center/mode', async (_req, res) => {
    try {
      const current = await getMode({ db });
      res.status(200).json({
        mode: current.mode,
        updated_at: current.updated_at,
        updated_by: current.updated_by,
      });
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 500;
      res.status(status).json({ error: error?.message || 'Failed to get command center mode' });
    }
  });

  app.post('/api/v1/lifeos/command-center/mode', deps.requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const { mode, triggered_by } = body;

      const receipt = await setMode({
        db,
        callCouncilMember,
        mode,
        triggered_by,
      });

      res.status(200).json(receipt);
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 500;
      res.status(status).json({ error: error?.message || 'Failed to set command center mode' });
    }
  });
}

export { registerCommandCenterModeRoutes };
export default registerCommandCenterModeRoutes;