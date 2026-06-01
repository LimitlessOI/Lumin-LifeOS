Amendment 46: BuilderOS Control Plane Proof Gap G10-100 Remediation
Proof-Closing Blueprint Note

This document outlines the plan to close the identified proof gap related to the BuilderOS control plane, specifically addressing the wiring of build lifecycle endpoints within `routes/lifeos-council-builder-routes.js`.

1. Exact Missing Implementation or Proof Gap

The proof gap is the absence of specific route handlers and associated logic within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle events. This includes:
-   `/build/start` POST Endpoint:
    -   Accepts `task_id`, `blueprint_id`, and `model_used` in the request body.
    -   Calls an internal `recordBuildStart` function with these parameters.
    -   Returns a success response (e.g., 201 Created) upon successful recording.
-   `/build/complete` POST Endpoint:
    -   Includes a pre-check: if `canMarkBuildDone()` returns `false` (indicating health RED), immediately return a `409 Conflict` response.
    -   Accepts a `token` and `oil_receipt_ids` in the request body.
    -   Calls an internal `recordBuildComplete` function with the provided `token` and `oil_receipt_ids`.
    -   Returns a success response (e.g., 200 OK) upon successful recording.

Proposed `routes/lifeos-council-builder-routes.js` additions (conceptual):

```javascript
// Assuming existing imports and router setup
import { Router } from 'express';
import { recordBuildStart, recordBuildComplete, canMarkBuildDone } from '../services/builderControlPlaneService.js'; // Example service path

const router = Router();

// Middleware to check build completion readiness
router.use('/build/complete', async (req, res, next) => {
  if (!(await canMarkBuildDone())) {
    return res.status(409).send('Cannot mark build done: System health is RED.');
  }
  next();
});

// POST /build/start
router.post('/build/start', async (req, res) => {
  const { task_id, blueprint_id, model_used } = req.body;
  if (!task_id || !blueprint_id || !model_used) {
    return res.status(400).send('Missing required parameters: task_id, blueprint_id, model_used.');
  }
  try {
    await recordBuildStart({ task_id, blueprint_id, model_used });
    res.status(201).send('Build start recorded successfully.');
  } catch (error) {
    console.error('Error recording build start:', error);
    res.status(500).send('Failed to record build start.');
  }
});

// POST /build/complete
router.post('/build/complete', async (req, res) => {
  const { token, oil_receipt_ids } = req.body;
  if (!token || !oil_receipt_ids || !Array.isArray(oil_receipt_ids)) {
    return res.status(400).send('Missing required parameters: token, oil_receipt_ids (array).');
  }
  try {
    await recordBuildComplete({ token, oil_receipt_ids });
    res.status(200).send('Build complete recorded successfully.');
  } catch (error) {
    console.error('Error recording build complete:', error);
    res.status(500).send('Failed to record build complete.');
  }
});

export default router;
```

2. Smallest Safe Build Slice to