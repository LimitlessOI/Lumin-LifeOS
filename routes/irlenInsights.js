/**
 * SYNOPSIS: HTTP route module — IrlenInsights.
 */
import express from 'express';

const insights = [
  { id: 1, insight: 'Use blue overlays to reduce glare.' },
  { id: 2, insight: 'Avoid fluorescent lighting to minimize discomfort.' },
  { id: 3, insight: 'Consider regular eye exercises for better focus.' }
];

function getIrlenInsights(req, res) {
  res.json(insights);
}

function registerIrlenInsightsRoutes(app) {
  const router = express.Router();
  router.get('/irlen-insights', getIrlenInsights);
  app.use('/api', router);
}

export { registerIrlenInsightsRoutes };