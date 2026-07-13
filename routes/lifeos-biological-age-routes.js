/**
 * SYNOPSIS: Registers BiologicalAgeRoutes routes/handlers (routes/lifeos-biological-age-routes.js).
 */
import express from 'express';
import { fetchBiologicalAge } from '../services/lifeos-biological-age.js';

const router = express.Router();

router.get('/biological-age/:userId', async (req, res) => {
  const { userId } = req.params;
  const data = await fetchBiologicalAge(userId);
  res.json(data);
});

export function registerBiologicalAgeRoutes(app) {
  app.use('/api', router);
}