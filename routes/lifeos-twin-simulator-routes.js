/**
 * SYNOPSIS: Registers TwinSimulatorRoutes routes/handlers (routes/lifeos-twin-simulator-routes.js).
 */
import express from 'express';
import { simulateTwinReactions } from '../services/lifeos-twin-simulator.js';

const router = express.Router();

router.post('/twin-simulator/:userId', async (req, res) => {
  const { userId } = req.params;
  const uiData = req.body.uiData;
  const response = await simulateTwinReactions(userId, uiData);
  res.json(response);
});

export function registerTwinSimulatorRoutes(app) {
  app.use('/api', router);
}