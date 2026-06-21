<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G631 100. -->

Amendment 46: BuilderOS Control Plane Proof - G631-100

Proof-Closing Blueprint Note: BuilderOS Control Plane Wiring

This document outlines the implementation plan to close the proof gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`, as specified by Amendment 46.

1.  **Exact Missing Implementation or Proof Gap:**
    The core gap is the absence of dedicated API endpoints and their corresponding internal logic calls within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS governed loop execution. Specifically:
    *   A `POST` endpoint for `/build/start` that internally calls `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   A `POST` endpoint for `/build/complete` that internally calls `recordBuildComplete` with `token` and `OIL receipt IDs`.
    *   The `/build/complete` endpoint must also incorporate a check using `canMarkBuildDone`. If `canMarkBuildDone` fails when the system health is RED, the endpoint must return a `409 Conflict` status.

2.  **Smallest Safe Build Slice to Close It:**
    The smallest safe build slice involves adding two new route handlers to `routes/lifeos-council-builder-routes.js` and ensuring the necessary service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, `getSystemHealth`) are imported and correctly invoked.

    **Proposed `routes/lifeos-council-builder-routes.js` additions (conceptual):**

    ```javascript
    // Assuming builderService provides the necessary functions
    import { recordBuildStart, recordBuildComplete, canMarkBuildDone, getSystemHealth } from '../services/builderService.js'; 
    // Adjust import path based on existing project structure

    // ... existing router setup ...

    // Route for build start
    router.post('/build/start', async (req, res) => {
      const { task_id, blueprint_id, model_used } = req.body;
      if (!task_id || !blueprint_id || !model_used) {
        return res.status(400).json({ error: 'Missing required parameters: task_id, blueprint_id, model_used' });
      }
      try {
        await recordBuildStart({ task_id, blueprint_id, model_used });
        res.status(202).json({ message: 'Build start recorded' });
      } catch (error) {
        console.error('Error recording build start:', error);
        res.status(500).json({ error: 'Failed to record build start' });
      }
    });

    // Route for build complete
    router.post('/build/complete', async (req, res) => {
      const { token, oil_receipt_ids } = req.body; 
      if (!token || !oil_receipt_ids) {
        return res.status(400).json({ error: 'Missing required parameters: token, oil_receipt_ids' });
      }

      try {
        const systemHealth = await getSystemHealth(); 
        if (systemHealth === 'RED' && !(await canMarkBuildDone(token))) { 
          return res.status(409).json({ error: 'Cannot mark build done: System health RED and build not cleared for completion' });
        }

        await recordBuildComplete(token, oil_receipt_ids);
        res.status(202).json({ message: 'Build complete recorded' });
      } catch (error) {
        console.error('Error recording build complete:', error);
        res.status(500).json({ error: 'Failed to record build complete' });
      }
    });
    ```

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js`: Add the new `POST /build/start` and `POST /build/complete` route definitions.
    *   `services/builderService.js` (or equivalent, e.g., `controllers/builderController.js`): Ensure `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and `getSystemHealth` functions are properly implemented and exposed. If these do not exist, they must be created following existing service/controller patterns.

4.  **Verifier/Runtime Checks:**
    *   **Unit/Integration Tests:**
        *   Verify `POST /build/start` correctly calls `recordBuildStart` with provided parameters.
        *   Verify `POST /build/complete` correctly calls `recordBuildComplete` with `token` and `oil_receipt_ids`.
        *   Verify `POST /build/complete` returns `409` when `getSystemHealth()` is 'RED' and `canMarkBuildDone()` returns `false`.
        *   Verify `POST /build/complete` returns `202` when `getSystemHealth()` is 'GREEN' or `canMarkBuildDone()` returns `true`.
    *   **Manual API Verification:**
        *   Send `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, `model_used`. Expect `202 Accepted`.
        *   Send `POST` request to `/build/complete` with valid `token` and `oil_receipt_ids` (under normal health conditions). Expect `202 Accepted`.
        *   Sim