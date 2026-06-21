<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G103-100 Remediation -->

# Amendment 46: BuilderOS Control Plane Proof - G103-100 Remediation

This document outlines the remediation plan and proof for closing the identified gaps in Amendment 46, specifically addressing the wiring of the BuilderOS control plane routes in `routes/lifeos-council-builder-routes.js`. The previous verifier rejection indicated a syntax error related to the `.md` file itself, which suggests the verifier was attempting to execute the proof document rather than evaluating the proposed code changes. This remediation focuses on providing the concrete implementation steps for the next C2 build pass.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of the specified route handlers within `routes/lifeos-council-builder-routes.js` to manage the build lifecycle events (`/build` start and complete) and enforce health-based completion conditions. Specifically:
-   No `POST /build/start` route to trigger `recordBuildStart`.
-   No `POST /build/complete` route to trigger `recordBuildComplete` and integrate `canMarkBuildDone` health checks.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding the two new POST routes to `routes/lifeos-council-builder-routes.js` and ensuring they correctly invoke the respective internal functions. This slice is isolated to the BuilderOS control plane and does not impact LifeOS user features or TSOS customer-facing surfaces.

### Proposed `routes/lifeos-council-builder-routes.js` additions:

```javascript
import express from 'express';
import { recordBuildStart, recordBuildComplete, canMarkBuildDone } from '../services/builder-control-plane-service.js'; // Example path, adjust as per actual structure
import { getSystemHealth } from '../services/health-service.js'; // Example path for health check

const router = express.Router();

// ... existing routes ...

/**
 * @route POST /build/start
 * @desc Records the start of a build process.
 * @access Internal (BuilderOS-only)
 */
router.post('/build/start', async (req, res) => {
  const { task_id, blueprint_id, model_used } = req.body;

  if (!task_id || !blueprint_id || !model_used) {
    return res.status(400).json({ message: 'Missing required parameters: task_id, blueprint_id, model_used' });
  }

  try {
    await recordBuildStart({ task_id, blueprint_id, model_used });
    res.status(200).json({ message: 'Build start recorded successfully.' });
  } catch (error) {
    console.error('Error recording build start:', error);
    res.status(500).json({ message: 'Failed to record build start.', error: error.message });
  }
});

/**
 * @route POST /build/complete
 * @desc Records the completion of a build process, with health check.
 * @access Internal (BuilderOS-only)
 */
router.post('/build/complete', async (req, res) => {
  const { token, oil_receipt_ids } = req.body; // Assuming token and OIL receipt IDs are in the body

  if (!token || !oil_receipt_ids) {
    return res.status(400).json({ message: 'Missing required parameters: token, oil_receipt_ids' });
  }

  try {
    const systemHealth = await getSystemHealth(); // Assuming this returns a health status object like { status: 'GREEN' }
    if (systemHealth.status === 'RED' && !(await canMarkBuildDone(token))) {
      return res.status(409).json({ message: 'Cannot mark build complete: System health is RED and build cannot be marked done.' });
    }

    await recordBuildComplete