<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G541 100. -->

Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane - G541-100
1. Exact Missing Implementation or Proof Gap:
The `routes/lifeos-council-builder-routes.js` module requires new API endpoints and associated handler logic to manage the BuilderOS build lifecycle. Specifically, endpoints for initiating a build (`POST /build/start`) and completing a build (`POST /build/complete`).
-   `POST /build/start`: This endpoint must internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   `POST /build/complete`: This endpoint must internally call `recordBuildComplete` with a build token and OIL receipt IDs. Before marking complete, it must check `canMarkBuildDone`. If `canMarkBuildDone` fails when the system health is RED, the endpoint must return a `409 Conflict` status.
The underlying `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions need to be implemented or integrated from an existing BuilderOS control plane service, ensuring they operate within the BuilderOS-only governed loop execution.

2. Smallest Safe Build Slice to Close It:
Implement the two new POST routes (`/build/start` and `/build/complete`) within `routes/lifeos-council-builder-routes.js`. Create a new `services/builderControlService.js` module to encapsulate the core logic for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. This service will handle interactions with BuilderOS-specific data stores and health monitors, ensuring strict adherence to the BuilderOS-only governance. The route handlers will then delegate to this new service.

3. Exact Safe-Scope Files to Touch First:
-   `routes/lifeos-council-builder-routes.js` (for defining the new API endpoints and their handlers)
-   `services/builderControlService.js` (new file for implementing the core build lifecycle logic: `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`)
-   `utils/builderHealthMonitor.js` (if `canMarkBuildDone` requires a dedicated health check utility, potentially new or an extension of an existing BuilderOS-specific health module).

4. Verifier/Runtime Checks:
-   **Unit Tests:** Develop comprehensive unit tests for `services/builderControlService.js` covering `recordBuildStart` (success, invalid input), `recordBuildComplete` (success, invalid token/receipts), and `canMarkBuildDone` (returns true when health is GREEN, returns false when health is RED).
-   **Integration Tests:**
    -   `POST /build/start` with valid `task_id`, `blueprint_id`, `model_used` returns `200 OK` or `202 Accepted`. Verify BuilderOS internal state reflects a build start.
    -   `POST /build/complete` with valid token and OIL receipt IDs returns `200 OK` or `202 Accepted` when `canMarkBuildDone` is true. Verify BuilderOS internal state reflects a build completion.
    -   `POST /build/complete` when `canMarkBuildDone` returns false (simulating RED health) returns `409 Conflict`.
-   **Manual Verification:** Trigger `/build/start` and `/build/complete` via a test client and observe BuilderOS control plane logs and database entries to confirm correct state transitions and data persistence.

5. Stop Conditions if Runtime Truth Disagrees:
-   If `recordBuildStart` or `recordBuildComplete` calls fail to correctly update BuilderOS internal state (e.g., build status not recorded, incorrect metadata persisted).
-   If `POST /build/complete` returns `409 Conflict` when BuilderOS health is GREEN and `canMarkBuildDone` should succeed.
-   If `POST /build/complete` returns `200 OK` when BuilderOS health is RED and `canMarkBuildDone` should fail.
-   If any new dependencies or modifications introduce changes to LifeOS user features or TSOS customer-facing surfaces, violating the core specification.
-   If the new routes are inaccessible (e.g., `404 Not Found`) or return unexpected server errors (`500 Internal Server Error`) for valid requests.