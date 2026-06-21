<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G845 100. -->

// File: routes/lifeos-council-builder-routes.js
// Proposed changes to wire BuilderOS control plane endpoints.

import express from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
  getSystemHealth, // Assuming a health check utility exists
} from '../services/builderControlService.js'; // Assuming internal services for build operations

const router = express.Router();

// Middleware to check system health for build completion
router.use('/build/complete', async (req, res, next) => {
  const health = await getSystemHealth(); // Get current system health
  if (health.status === 'RED' && !(await canMarkBuildDone(req.body.token)))