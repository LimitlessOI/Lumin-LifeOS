/**
 * SYNOPSIS: Registers CommandCenterModeRoutes routes/handlers (routes/command-center-mode-routes.js).
 */
import { setMode, getMode } from '../services/builder-runtime-mode-service.js';

const VALID_MODES = new Set(['live', 'safe', 'maintenance']);

function getDb(deps) {
  return deps?.db ?? deps?.pool;
}

function normalizeMode(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

export function registerCommandCenterModeRoutes(app, deps = {}) {
  const db = getDb(deps);
  const callCouncilMember = deps?.callCouncilMember;

  app.get('/api/v1/lifeos/command-center/mode', async (req, res) => {
    try {
      if (!db) return sendError(res, 500, 'Database unavailable');

      const current = await getMode({ db });
      return res.status(200).json({
        mode: current.mode,
        updated_at: current.updated_at,
        updated_by: current.updated_by,
      });
    } catch (error) {
      deps?.logger?.error?.({ err: error }, 'Failed to read command center mode');
      return sendError(res, 500, 'Failed to read command center mode');
    }
  });

  app.post('/api/v1/lifeos/command-center/mode', deps?.requireKey, async (req, res) => {
    try {
      if (!db) return sendError(res, 500, 'Database unavailable');
      if (typeof callCouncilMember !== 'function') {
        return sendError(res, 500, 'Council member service unavailable');
      }

      const mode = normalizeMode(req.body?.mode);
      const triggered_by = typeof req.body?.triggered_by === 'string' ? req.body.triggered_by.trim() : '';

      if (!VALID_MODES.has(mode)) {
        return sendError(res, 400, 'Invalid mode');
      }

      if (!triggered_by) {
        return sendError(res, 400, 'triggered_by is required');
      }

      const receipt = await setMode({
        db,
        callCouncilMember,
        mode,
        triggered_by,
      });

      return res.status(200).json(receipt);
    } catch (error) {
      const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
      const message = typeof error?.message === 'string' && error.message ? error.message : 'Failed to update command center mode';
      deps?.logger?.error?.({ err: error }, 'Failed to update command center mode');
      return sendError(res, status, message);
    }
  });
}

export default registerCommandCenterModeRoutes;