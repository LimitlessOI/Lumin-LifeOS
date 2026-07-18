/**
 * SYNOPSIS: HTTP route module — EnvironmentRoutes.
 * @ssot docs/products/ai-receptionist/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

function registerEnvironmentRoutes(app, deps = {}) {
  const guard = deps.requireKey || ((req, res, next) => next());

  router.get('/api/v1/env', guard, (_req, res) => {
    res.json({ ok: true, VAPI_API_KEY_set: Boolean(process.env.VAPI_API_KEY) });
  });

  router.post('/api/v1/env', guard, (req, res) => {
    const { key, VAPI_API_KEY } = req.body || {};
    const value = VAPI_API_KEY || key;
    if (!value) {
      return res.status(400).json({ ok: false, error: 'VAPI_API_KEY or key required' });
    }
    process.env.VAPI_API_KEY = value;
    res.json({ ok: true, set: true });
  });

  app.use(router);
}

export { registerEnvironmentRoutes };
