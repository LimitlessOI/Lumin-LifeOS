import express from 'express';
import { recordBuildStart, recordBuildComplete, canMarkBuildDone } from '../services/builder-control-plane-service.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('BuilderOSCouncilRoutes');

// Middleware to parse JSON body
router.use(express.json());

/**
 * POST /build/start
 * Records the start of a build process.
 * Expected body: { task_id: string, blueprint_id: string, model_used: string }
 */
router.post('/build/start', async (req, res) => {
  const { task_id, blueprint_id, model_used } =