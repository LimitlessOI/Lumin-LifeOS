/**
 * SYNOPSIS: HTTP route module — Competitor Info.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

// GET /api/v1/competitors
router.get('/', (req, res) => {
  res.json({ competitor: {} });
});

export function registerCompetitorRoutes(app) {
  app.use('/api/v1/competitors', router);
}
