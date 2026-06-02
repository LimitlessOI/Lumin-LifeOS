Amendment 46: BuilderOS Control Plane Proof - G957-100
Proof-Closing Blueprint Note: Wiring `routes/lifeos-council-builder-routes.js`

This document outlines the implementation plan and verification steps for wiring the BuilderOS control plane routes as specified in Amendment 46.

1. Exact Missing Implementation or Proof Gap
The current `routes/lifeos-council-builder-routes.js` file lacks the necessary endpoints to manage BuilderOS build lifecycle events:
-   A `POST` endpoint for `/build/start` to initiate build recording.
-   A `POST` endpoint for `/build/complete` to finalize build recording and process OIL receipts.
-   Integration of a health check (`canMarkBuildDone`) to prevent build completion under critical conditions.
The proof gap is the absence of these specific route definitions and their associated logic within the designated router file.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves adding two new `POST` routes to `routes/lifeos-council-builder-routes.js` and integrating calls to existing or co-developed service functions.

Proposed `routes/lifeos-council-builder-routes.js` additions will include:
-   A `POST` route at `/build/start` that accepts `task_id`, `blueprint_id`, and `model_used` in its body. This route will call an internal `recordBuildStart` function with these parameters.
-   A `POST` route at `/build/complete` that accepts a `token` and `OIL receipt IDs` in its body. Before marking completion, it will check `canMarkBuildDone`. If `canMarkBuildDone` fails (e.g., health is RED), it will return a `409 Conflict` status. Otherwise, it will call an internal `recordBuildComplete` function with the provided token and receipt IDs.

3. Exact Safe-Scope Files to Touch First
-   `routes/lifeos-council-builder-routes.js`: To define and implement the new POST endpoints.
-   `services/builder-lifecycle-service.js` (or similar existing service): To implement or extend `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` if they do not fully exist or require modification.

4. Verifier/Runtime Checks
-   **Unit Tests**: Verify that `recordBuildStart` and `recordBuildComplete` are invoked with the correct parameters when the respective routes are hit.
-   **Integration Tests**: Simulate a full build lifecycle (start and complete) via API calls to ensure data persistence and state transitions are correct.
-   **Error Handling Tests**: Verify that a `409 Conflict` is returned when `canMarkBuildDone` indicates a failure condition (e.g., health RED) during a `/build/complete` request.
-   **Payload Validation**: Ensure incoming request bodies for `task_id`, `blueprint_id`, `model_used`, `token`, and `OIL receipt IDs` are correctly parsed and validated.
-   **System Impact**: Monitor LifeOS user features and TSOS customer-facing surfaces to confirm no unintended side effects.

5. Stop Conditions if Runtime Truth Disagrees
-   If `recordBuildStart` or `recordBuildComplete` calls fail to correctly update the BuilderOS state or persist build records.
-   If the `/build/complete` endpoint does not return `409 Conflict` when `canMarkBuildDone` indicates a critical health status.
-   If the new routes introduce latency or performance degradation to the BuilderOS control plane.
-   If any existing BuilderOS or LifeOS functionality is inadvertently altered or broken.
-   If the data recorded for builds (e.g., `task_id`, `blueprint_id`, `model_used`, `OIL receipt IDs`) is incomplete or incorrect.