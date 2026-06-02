Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane - Proof G623-100

Context: This note addresses the follow-through signal for Amendment 46, specifically wiring `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. This implementation focuses on integrating build start and completion events with the BuilderOS control plane, ensuring proper state transitions and health checks.

**1. Exact Missing Implementation or Proof Gap:**
The primary gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to signal the start and completion of a BuilderOS build process. This includes:
-   A `POST` endpoint for `/build/start` to initiate a build record, calling `recordBuildStart`.
-   A `POST` endpoint for `/build/complete` to finalize a build record and integrate OIL receipt IDs, calling `recordBuildComplete`.
-   Integration of a health check (`canMarkBuildDone`) before build completion to prevent state transitions under critical conditions, returning a 409 conflict.

**2. Smallest Safe Build Slice to Close It:**
Implement two new `POST` routes in `routes/lifeos-council-builder-routes.js`. These routes will:
-   **`/build/start` (POST):**
    -   Accept `task_id`, `blueprint_id`, and `model_used` in the request body.
    -   Call `builderService.recordBuildStart({ task_id, blueprint_id, model_used })`.
    -   Respond with `202 Accepted` on success.
-   **`/build/complete` (POST):**
    -   Accept `token` and `oil_receipt_ids` in the request body.
    -   First, call `builderService.canMarkBuildDone()`.
    -   If `canMarkBuildDone()` returns `false` (indicating health RED), respond with `409 Conflict`.
    -   Otherwise, call `builderService.recordBuildComplete({ token, oil_receipt_ids })`.
    -   Respond with `202 Accepted` on success.

**3. Exact Safe-Scope Files to Touch First:**
-   `routes/lifeos-council-builder-routes.js`: Add the new `POST` endpoints and their associated logic.
-   `services/builderControlPlaneService.js` (assumed existing): Verify `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are correctly implemented and exposed.

**4. Verifier/Runtime Checks:**
-   **Build Start Verification:**
    -   `curl -X POST -H "Content-Type: application/json" -d '{"task_id": "test-task-1", "blueprint_id": "test-bp-1", "model_used": "gemma-2-