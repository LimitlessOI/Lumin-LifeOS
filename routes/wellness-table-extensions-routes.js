/**
 * SYNOPSIS: HTTP routes for wellness table extensions.
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

// POST /api/v1/wellness/extensions/joy-checkins
router.post('/joy-checkins', (req, res) => {
  res.status(201).json({ ok: true, type: 'joy-checkins', data: req.body });
});

// POST /api/v1/wellness/extensions/integrity-score
router.post('/integrity-score', (req, res) => {
  res.status(201).json({ ok: true, type: 'integrity-score', data: req.body });
});

// POST /api/v1/wellness/extensions/wearable-data
router.post('/wearable-data', (req, res) => {
  res.status(201).json({ ok: true, type: 'wearable-data', data: req.body });
});

// POST /api/v1/wellness/extensions/emotional-patterns
router.post('/emotional-patterns', (req, res) => {
  res.status(201).json({ ok: true, type: 'emotional-patterns', data: req.body });
});

export function registerWellnessTableExtensionsRoutes(app) {
  // mount routes at /api/v1/wellness/extensions
  app.use('/api/v1/wellness/extensions', router);
}

// Alias expected by wellness-studio-step12 BUILD_QUEUE contract.
export function registerWellnessExtensionsRoutes(app) {
  registerWellnessTableExtensionsRoutes(app);
  app.post('/api/v1/wellness/extend', (req, res) => {
    res.status(201).json({ ok: true, type: 'wellness-extend', data: req.body });
  });
}
