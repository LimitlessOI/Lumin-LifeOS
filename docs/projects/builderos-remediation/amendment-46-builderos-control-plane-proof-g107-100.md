# Amendment 46: BuilderOS Control Plane Proof - G107-100 Remediation

## Proof-Closing Blueprint Note

This document addresses the OIL verifier rejection and outlines the implementation required to wire the BuilderOS control plane routes in `routes/lifeos-council-builder-routes.js` as per Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of the `/build` start and complete POST endpoints within `routes/lifeos-council-builder-routes.js`, and the corresponding calls to internal BuilderOS service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) with appropriate request body parsing and error handling. Specifically, the `canMarkBuildDone` health check and 409 conflict response for RED health states are missing.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new POST routes to `routes/lifeos-council-builder-routes.js`:
-   `/build/start`: To initiate a build record.
-   `/build/complete`: To finalize a build record, including health checks.

These routes will interact with an assumed `builderService` module for core logic.

### 3. Exact Safe-Scope Files to Touch First

1.  `routes/lifeos-council-builder-routes.js`: Add the new POST route definitions and handlers.
2.  `services/builderService.js` (assumed): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are correctly implemented and exported.

### 4. Proposed Implementation for `routes/lifeos-council-builder-routes.js`

```javascript
// routes/lifeos-council-builder-routes.js (excerpt, extending existing router)

import { Router } from 'express';
import * as builderService from '../services/builderService.js'; // Assuming this path

const router = Router();

// Existing routes...

/**
 * @route POST /build/start
 * @description Records the start of a BuilderOS build task.
 * @body {string} task_id - The ID of the build task.
 * @body {string} blueprint_id - The ID of the blueprint being built.
 * @body {string} model_used - The model used for the build.
 * @access Internal BuilderOS
 */
router.post('/build/start', async (req, res) => {
  const { task_id, blueprint_id, model_used } = req.body;

  if (!task_id || !blueprint_id || !model_used) {
    return res.status(400).json({ error: 'Missing required parameters: task_id, blueprint_id, model_used' });
  }

  try {
    await builderService.recordBuildStart({ task_id, blueprint_id, model_used });
    res.status(202).json({ message: 'Build start recorded successfully' });
  } catch (error) {
    console.error('Error recording build start:', error);
    res.status(500).json({ error: 'Failed to record build start' });
  }
});

/**
 * @route POST /build/complete
 * @description Records the completion of a BuilderOS build task.
 * @body {string} token - Authentication token for the build.
 * @body {string[]} oil_receipt_ids - Array of OIL receipt IDs.
 * @access Internal BuilderOS
 */
router.post('/build/complete', async (req, res) => {
  const { token, oil_receipt_ids } = req.body;

  if (!token || !oil_receipt_ids || !Array.isArray(oil_receipt_ids)) {
    return res.status(400).json({ error: 'Missing required parameters: token, oil_receipt_ids (array)' });
  }

  try {
    const canComplete = await builderService.canMarkBuildDone();
    if (!canComplete) {
      // Health is RED, cannot mark build done
      return res.status(409).json({ error: 'Build completion rejected: System health is not GREEN.' });
    }

    await builderService.recordBuildComplete(token, oil_receipt_ids);
    res.status(200).json({ message: 'Build complete recorded successfully' });
  } catch (error) {
    console.error('Error recording build complete:', error);
    res.status(500).json({ error: 'Failed to record build complete' });
  }
});

// export default router; // Assuming ESM export
```

### 5. Verifier/Runtime Checks

*   **Unit/Integration Tests:**
    *   `POST /build/start`:
        *   Verify 202 response on success.
        *   Verify `builderService.recordBuildStart` is called with correct `task_id`, `blueprint_id`, `model_used`.
        *   Verify 400 response if required body parameters are missing.
    *   `POST /build/complete`:
        *   Verify 200 response on success when `builderService