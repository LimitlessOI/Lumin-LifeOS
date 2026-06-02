// File: routes/lifeos-council-builder-routes.js (proposed additions/modifications)

import express from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
  getBuilderHealthStatus // Assuming this function exists to check builder health
} from '../services/builder-control-plane-service.js'; // Assuming a service layer for these functions

const router = express.Router();

/**
 * POST /build
 * Records the start of a new build process.
 * Requires task_id, blueprint_id, and model_used in the request body.
 */
router.post('/build', async (req, res) => {
  const { task_id, blueprint_id