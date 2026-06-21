<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G473 100. -->

Amendment 46: BuilderOS Control Plane Proof - G473-100
This document serves as a proof-closing blueprint note for the BuilderOS Control Plane, specifically addressing the wiring of `routes/lifeos-council-builder-routes.js` as per the instruction.

Blueprint Note: BuilderOS Control Plane Route Wiring

1.  **Exact Missing Implementation or Proof Gap:**
    The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary route definitions and associated handler logic to manage the BuilderOS build lifecycle as specified. Specifically, the following are missing:
    *   A `POST /build/start` endpoint to record the initiation of a build, requiring `task_id`, `blueprint_id`, and `model_used`.
    *   A `POST /build/complete` endpoint to record the completion of a build, requiring a build token and OIL receipt IDs.
    *   Integration with a `canMarkBuildDone` health check function, which should prevent build completion and return a 409 status if the system health is RED.

2.  **Smallest Safe Build Slice to Close It:**
    Implement the two new `POST` routes (`/build/start` and `/build/complete`) within `routes/lifeos-council-builder-routes.js`. These routes will delegate to a new or existing controller/service layer responsible for:
    *   Calling an internal `recordBuildStart` function with the provided build parameters.
    *   Calling an internal `recordBuildComplete` function with the build token and OIL receipt IDs.
    *   Before `recordBuildComplete`, invoke `canMarkBuildDone`. If it returns `false` (indicating RED health), immediately respond with a 409 Conflict status.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js` (for route definitions)
    *   `controllers/build-lifecycle-controller.js` (or similar, to encapsulate route logic)
    *   `services/build-lifecycle-service.js` (or similar, to implement `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`)

4.  **Verifier/Runtime Checks:**
    *   **Unit Tests:** Verify `recordBuildStart` correctly persists build initiation data.
    *   **Unit Tests:** Verify `recordBuildComplete` correctly updates build status and associates OIL receipts.
    *   **Unit Tests:** Verify `canMarkBuildDone` returns `false` when health is RED and `true` otherwise.
    *   **Integration Tests:**
        *   Send `POST /build/start` and assert a 200 OK response and correct data persistence.
        *   Send `POST /build/complete` with valid data and assert a 200 OK response and correct data updates.
        *   Configure system health to RED (mock `canMarkBuildDone` to return `false`), then send `POST /build/complete` and assert a 409 Conflict response.
    *   **Runtime Monitoring:** Observe successful build start/complete events in logs. Monitor for 409 responses on build completion attempts during degraded health.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If `POST /build/start` fails to create a build record or returns an incorrect response.
    *   If `POST /build/complete` fails to update the build record, process OIL receipts, or returns an incorrect response (e.g., 200 when 409 is expected, or vice-versa).
    *   If build state transitions are inconsistent or data integrity is compromised after these routes are active.
    *   If the system exhibits unexpected performance degradation or resource contention related to build lifecycle management.