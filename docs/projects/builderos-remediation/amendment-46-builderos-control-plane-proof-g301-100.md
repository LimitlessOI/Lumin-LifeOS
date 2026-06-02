# Amendment 46 BuilderOS Control Plane Proof G301-100

## Purpose
This document provides the proof-closing blueprint note for the implementation of BuilderOS control plane build lifecycle signaling within `routes/lifeos-council-builder-routes.js`, as specified in Amendment 46. This addresses the requirement to wire build start and complete events, including health-based conditional completion.

## 1. Exact Missing Implementation or Proof Gap
The primary gap is the absence of explicit route handlers and associated service calls within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. Specifically:
*   A `POST /build/start` endpoint to initiate a build record.
*   A `POST /build/complete` endpoint to finalize a build record, incorporating OIL receipt IDs and conditional completion based on system health.
*   Integration with a `buildLifecycleService` (or similar) for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.

## 2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves adding two new `POST` routes to `routes/lifeos-council-builder-routes.js` and ensuring the necessary service functions are imported and called.

### Proposed `routes/lifeos-council-builder-routes.js` additions:

```javascript
// Assuming existing imports for express, router, and a buildLifecycleService
import { Router } from 'express';
import { recordBuildStart, recordBuildComplete, canMarkBuildDone, getSystemHealth } from '../services/build-lifecycle-service.js'; // Assuming this service exists
import { logger } from '../utils/logger.js'; // Assuming a logger utility

const router = Router();

// ... existing routes ...

/**
 * @route POST /build/start
 * @description Records the start of a BuilderOS build.
 * @body {string} task_id - The ID of the task initiating the build.
 * @body {string} blueprint_id - The ID of the blueprint being built.
 * @body {string} model_used - The model used for the build.
 */
router.post('/build/start', async (req, res) => {
  const { task_id, blueprint_id, model_used } = req.body;
  if (!task_id || !blueprint_id || !model_used) {
    logger.warn('Missing required fields for build start', { task_id, blueprint_id, model_used });
    return res.status(400).json({ error: 'Missing task_id, blueprint_id, or model_used' });
  }
  try {
    const buildRecord = await recordBuildStart({ task_id, blueprint_id, model_used });
    logger.info('Build start recorded', { buildId: buildRecord.id, task_id, blueprint_id });
    res.status(200).json({ message: 'Build start recorded', buildId: buildRecord.id });
  } catch (error) {
    logger.error('Failed to record build start', { error: error.message, task_id, blueprint_id });
    res.status(500).json({ error: 'Failed to record build start' });
  }
});

/**
 * @route POST /build/complete
 * @description Records the completion of a BuilderOS build.
 * @body {string} build_token - A token identifying the build.
 * @body {string[]} oil_receipt_ids - Array of OIL receipt IDs.
 */
router.post('/build/complete', async (req, res) => {
  const { build_token, oil_receipt_ids } = req.body;
  if (!build_token || !Array.isArray(oil_receipt_ids)) {
    logger.warn('Missing required fields for build complete', { build_token, oil_receipt_ids });
    return res.status(400).json({ error: 'Missing build_token or oil_receipt_ids' });
  }

  try {
    const systemHealth = await getSystemHealth(); // Assuming a function to get current system health
    if (systemHealth === 'RED' && !(await canMarkBuildDone(build_token))) {
      logger.warn('Build completion rejected due to RED health and canMarkBuildDone failure', { build_token });
      return res.status(409).json({ error: 'Cannot mark build done: System health is RED and build conditions not met.' });
    }

    const completionResult = await recordBuildComplete(build_token, oil_receipt_ids);
    logger.info('Build complete recorded', { build_token, oil_receipt_ids });
    res.status(200).json({ message: 'Build complete recorded', completionResult });
  } catch (error) {
    logger.error('Failed to record build complete', { error: error.message, build_token });
    res.status(500).json({ error: 'Failed to record build complete' });
  }