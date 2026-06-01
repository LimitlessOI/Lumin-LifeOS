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
router.post('/build/start', *route => {
  const { task_id, blueprint_id, model_used } = *body;
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
router.post('/build/complete', *route => {
  const { token, oil_receipt_ids } = *body;
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

expDef router;
```

2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves implementing the new BuilderOS control plane endpoints and their underlying service logic. This includes:
-   **Route Definition:** Adding the `/build/start` and `/build/complete` POST routes to `routes/lifeos-council-builder-routes.js`.
-   **Service Layer Implementation:** Creating or extending `services/builderControlPlaneService.js` to include `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. These functions will interact with the BuilderOS data store (e.g., a database table for build records) and the system health monitoring service.
-   **Dependency Injection/Wiring:** Ensuring `routes/lifeos-council-builder-routes.js` is correctly imported and used by the main application router.

3. Exact Safe-Scope Files to Touch First

The following files are within the approved builder safe scope and should be touched first:
-   `routes/lifeos-council-builder-routes.js`: To add the new route definitions and middleware.
-   `services/builderControlPlaneService.js`: To implement the core business logic for recording build events and checking system health.
-   `tests/unit/services/builderControlPlaneService.test.js`: To add unit tests for the new service functions.
-   `tests/integration/routes/lifeos-council-builder-routes.test.js`: To add integration tests for the new API endpoints.

4. Verifier/Runtime Checks

To verify the implementation and ensure correct runtime behavior:
-   **Unit Tests:** Verify `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions behave as expected in isolation, covering success, failure, and edge cases (e.g., invalid inputs, database errors, health states).
-   **Integration Tests:**
    -   `POST /build/start`: Send valid and invalid payloads; assert 201 Created/400 Bad Request and verify build start record creation.
    -   `POST /build/complete`:
        -   When `canMarkBuildDone()` returns `true`: Send valid and invalid payloads; assert 200 OK/400 Bad Request and verify build complete record creation.
        -   When `canMarkBuildDone()` returns `false`: Send any payload; assert 409 Conflict.
-   **System Health Monitoring:** Monitor the BuilderOS control plane for increased error rates or unexpected behavior after deployment.
-   **Database Verification:** Directly query the BuilderOS build records table to confirm `recordBuildStart` and `recordBuildComplete` are persisting data correctly.

5. Stop Conditions if Runtime Truth Disagrees

The build pass should be halted and rolled back if any of the following conditions are observed in runtime or during verification:
-   **Functional Failure:**
    -   `POST /build/start` or `POST /build/complete` endpoints consistently return 5xx errors or incorrect status codes (e.g., 200 instead of 201 for start).
    -   Build records are not created or updated in the BuilderOS data store as expected.
    -   The `canMarkBuildDone` check fails to return 409 when the system health is explicitly set to RED.
-   **Performance Degradation:** Significant latency increase (e.g., >50ms average response time) for the new endpoints under expected load.
-   **Resource Exhaustion:** Unexplained spikes in CPU, memory, or database connection usage on the BuilderOS control plane.
-   **Unintended Side Effects:** Any observed impact on existing LifeOS user features or TSOS customer-facing surfaces, indicating a breach of the safe scope.
-   **Security Vulnerabilities:** Introduction of new, easily exploitable vulnerabilities (e.g., unhandled input, authentication bypass).