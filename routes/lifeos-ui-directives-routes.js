/**
 * SYNOPSIS: Twin ui_directives + reaction simulate — wired to real services.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { createUiDirectivesService } from '../services/lifeos-ui-directives.js';
import { createTwinReactionSimulator } from '../services/lifeos-twin-reaction-simulator.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

function pickAuth(deps) {
  if (typeof deps?.requireAuth === 'function') return deps.requireAuth;
  if (typeof deps?.requireKey === 'function') return deps.requireKey;
  return null;
}

function resolveUserHint(req) {
  return (
    req.body?.user ||
    req.body?.user_id ||
    req.query?.user ||
    req.query?.user_id ||
    req.lifeosUser?.handle ||
    req.lifeosUser?.sub ||
    req.user?.id ||
    'adam'
  );
}

export function registerLifeosUiDirectivesRoutes(app, deps = {}) {
  const { pool, logger, callCouncilMember } = deps;
  const authMiddleware = pickAuth(deps);

  if (!app || typeof app.post !== 'function' || typeof app.get !== 'function') {
    throw new Error('registerLifeosUiDirectivesRoutes requires an express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerLifeosUiDirectivesRoutes requires deps.pool');
  }

  const ui = createUiDirectivesService({ pool });
  const reaction = createTwinReactionSimulator({ pool, callCouncilMember });
  const resolveUserId = makeLifeOSUserResolver(pool);
  const prefix = '/api/v1/lifeos/twin';
  const withAuth = authMiddleware ? [authMiddleware] : [];

  app.post(`${prefix}/ui-directives/propose`, ...withAuth, async (req, res) => {
    try {
      const userId = await resolveUserId(resolveUserHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const text = req.body?.text ?? req.body?.directive ?? '';
      const result = await ui.proposeDirectives({ userId, text });
      return res.json({
        ok: true,
        proposed: result.proposed,
        needs_confirm: true,
        user_id: userId,
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'ui-directives propose failed');
      return res.status(400).json({ ok: false, error: error.message || 'propose_failed' });
    }
  });

  app.post(`${prefix}/ui-directives/apply`, ...withAuth, async (req, res) => {
    try {
      const userId = await resolveUserId(resolveUserHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      if (req.body?.confirm !== true && req.body?.confirmed !== true) {
        return res.status(400).json({
          ok: false,
          error: 'confirm_required',
          message: 'Confirm before apply — send confirm:true with directives.',
        });
      }
      const directives = req.body?.directives;
      if (!directives || typeof directives !== 'object' || Array.isArray(directives)) {
        return res.status(400).json({ ok: false, error: 'directives object required' });
      }
      const prefs = await ui.applyDirectives({ userId, directives });
      return res.json({
        ok: true,
        applied: prefs?.ui_directives || directives,
        flourishing_prefs: prefs,
        user_id: userId,
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'ui-directives apply failed');
      return res.status(400).json({ ok: false, error: error.message || 'apply_failed' });
    }
  });

  app.get(`${prefix}/ui-directives`, ...withAuth, async (req, res) => {
    try {
      const userId = await resolveUserId(resolveUserHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const directives = await ui.getDirectives(userId);
      return res.json({ ok: true, ui_directives: directives, user_id: userId });
    } catch (error) {
      logger?.error?.({ err: error }, 'ui-directives get failed');
      return res.status(500).json({ ok: false, error: error.message || 'get_failed' });
    }
  });

  app.post(`${prefix}/reaction/simulate`, ...withAuth, async (req, res) => {
    try {
      const userId = await resolveUserId(resolveUserHint(req));
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const idea = req.body?.idea ?? req.body?.proposal ?? '';
      if (!idea || (typeof idea === 'string' && !idea.trim())) {
        return res.status(400).json({ ok: false, error: 'idea is required' });
      }
      const result = await reaction.simulate({
        userId,
        idea,
        context: req.body?.context || null,
      });
      return res.json({ ok: true, ...result, user_id: userId });
    } catch (error) {
      logger?.error?.({ err: error }, 'reaction simulate failed');
      return res.status(500).json({ ok: false, error: error.message || 'simulate_failed' });
    }
  });

  return app;
}

export default registerLifeosUiDirectivesRoutes;