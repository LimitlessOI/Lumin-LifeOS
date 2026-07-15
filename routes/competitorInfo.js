/**
 * SYNOPSIS: Registers CompetitorRoutes routes/handlers (routes/competitorInfo.js).
 */
import express from 'express';

const router = express.Router();

function getCompetitorInfo(req, res) {
  // Logic to fetch and display competitor information
  res.json({ message: 'Competitor information' });
}

export function registerCompetitorRoutes(app) {
  router.get('/competitor-info', getCompetitorInfo);
  app.use('/api', router);
}

export { getCompetitorInfo };
