Proof-Closing Blueprint Note: G263-100 - BuilderOS Control Plane Wiring

1.  **Exact Missing Implementation or Proof Gap:**
    The `routes/lifeos-council-builder-routes.js` file requires new POST endpoints to manage the BuilderOS build lifecycle. Specifically, it needs:
    *   A route for `/build/start` that accepts `task_id`, `blueprint_id`, and `model_used` in its body and calls an internal `recordBuildStart` function.
    *   A route for `/build/complete` that accepts a `token` and `OIL receipt IDs` in its body and calls an internal `recordBuildComplete` function.
    *   The `/build/complete` route must return a 409 Conflict status if an internal `canMarkBuildDone` function fails, particularly when the system health is RED.

2.  **Smallest Safe Build Slice to Close It:**
    Implement the two new POST routes (`/build/start` and `/build/complete`) within `routes/lifeos-council-builder-routes.js`. This slice will include the necessary request body parsing, validation, and the calls to the respective internal build management functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`). This change is isolated to the BuilderOS control plane and does not affect LifeOS user features or TSOS customer-facing surfaces.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js`: Add the new POST route definitions and their handler logic.
    *   (Implicitly, existing internal service files): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are accessible and correctly implemented within the BuilderOS internal service layer that `routes/lifeos-council-builder-routes.js` will interact with.

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests:**
        *   Verify `POST /build/start` successfully invokes `recordBuildStart` with the correct parameters (`task_id`, `blueprint_id`, `model_used`).
        *   Verify `POST /build/complete` successfully invokes `recordBuildComplete` with the correct parameters (`token`, `OIL receipt IDs`).
        *   Verify `POST /build/complete` returns a 409 status code when `canMarkBuildDone` indicates a failure (e.g., system health is RED).
        *   Verify `POST /build/complete` returns a 200-level success status code when `canMarkBuildDone` passes.
    *   **Integration Tests:**
        *   Deploy the BuilderOS control plane and simulate a full build lifecycle (start and complete) to ensure end-to-end functionality.
        *   Monitor internal logs and metrics to confirm build events are recorded accurately.
        *   Test scenarios where system health is intentionally set to RED to confirm the 409 response for build completion.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If `recordBuildStart` or `recordBuildComplete` are not called or fail to update the internal build state as expected.
    *   If the `/build/complete` endpoint does not consistently return a 409 status when `canMarkBuildDone` indicates a blocking condition (e.g., RED health).
    *   If any unintended side effects are observed on existing BuilderOS operations or, critically, on LifeOS user features or TSOS customer-facing surfaces.
    *   If the build lifecycle state in the control plane does not accurately reflect the actual build progress.