<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G243 100. -->

import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
} from '../services/builder-control-plane-service.js'; // Assumed existing module

const router = Router();

/**
 * POST /build/start
 * Records the initiation of a build process.
 * Requires task_id, blueprint_id, and model_used in the request body.
 */
router.post('/build/start', async (req, res) => {
  const { task_id, blueprint_id, model_used } = req.body;

  if (!task_id || !blueprint_id || !model_used) {
    return res.status(400).json({ error: 'Missing required parameters: task_id, blueprint_id, model_used' });
  }

  try {
    const result = await recordBuildStart({ task_id, blueprint_id, model_used });
    // Using 202 Accepted as the build process is initiated, not necessarily completed.
    return res.status(202).json({ message: 'Build start recorded', data: result });
  } catch (error) {
    console.error('Error recording build start:', error);
    return res.status(500).json({ error: 'Failed to record build start' });
  }
});

/**
 * POST /build/complete
 * Records the completion of a build process.
 * Requires token and oil_receipt_ids in the request body.
 * Returns 409 Conflict if canMarkBuildDone fails (e.g., due to RED health).
 */
router.post('/build/complete', async (req, res) => {
  const { token, oil_receipt_ids } = req.body;

  if (!token || !oil_receipt_ids || !Array.isArray(oil_receipt_ids)) {
    return res.status(400).json({ error: 'Missing or invalid required parameters: token, oil_receipt_ids (array)' });
  }

  try {
    // Check if the build can be marked as done, incorporating health checks.
    // The canMarkBuildDone function is assumed to encapsulate the "health RED" check.
    const canProceed = await canMarkBuildDone({ token, oil_receipt_ids });
    if (!canProceed) {
      // As per spec, return 409 if canMarkBuildDone fails when health is RED.
      return res.status(409).json({ error: 'Build cannot be marked complete due to system health or policy constraints' });
    }

    const result = await recordBuildComplete({ token, oil_receipt_ids });
    // Using 202 Accepted as the completion is recorded, but further internal processing might occur.
    return res.status(202).json({ message: 'Build complete recorded', data: result });
  } catch (error) {
    console.error('Error recording build complete:', error);
    return res.status(500).json({ error: 'Failed to record build complete' });
  }
});

export default router;