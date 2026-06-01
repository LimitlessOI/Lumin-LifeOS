Amendment 46 BuilderOS Control Plane Proof - G52-100
This document outlines the proof-closing blueprint note for wiring the BuilderOS control plane routes as specified in Amendment 46.

Proof-Closing Blueprint Note

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file requires the addition of new POST endpoints to manage the BuilderOS build lifecycle:
    *   A `POST /build/start` endpoint that accepts `task_id`, `blueprint_id`, and `model_used` in its body and internally calls `recordBuildStart` with these parameters.
    *   A `POST /build/complete` endpoint that accepts a `token` and `OIL receipt IDs` in its body and internally calls `recordBuildComplete` with these parameters.
    *   The `POST /build/complete` endpoint (or a preceding middleware) must incorporate a check using `canMarkBuildDone`. If `canMarkBuildDone` evaluates to false when the system health is RED, the endpoint must return an HTTP 409 Conflict status.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves:
    *   Defining the new `/build/start` and `/build/complete` routes within `routes/lifeos-council-builder-routes.js`.
    *   Implementing the corresponding handler functions, which will import and invoke `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` from an appropriate BuilderOS service or utility module.
    *   Adding error handling logic to return 409 for the `canMarkBuildDone` failure condition.
    *   Ensuring `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are implemented and accessible within the BuilderOS control plane.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js` (for route definitions and initial handler wiring)
    *   `controllers/builder-council-controller.js` (or similar, for implementing the route handler logic that orchestrates service calls)
    *   `services/builder-council-service.js` (or similar, for implementing `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` business logic)

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:** Verify that the new route handlers correctly parse input, call the expected internal functions (`recordBuildStart`, `recordBuildComplete`), and handle the `canMarkBuildDone` failure condition by returning 409.
    *   **Integration Tests:**
        *   `POST /build/start` with valid payload returns 200/201 and triggers `recordBuildStart` internally.
        *   `POST /build/complete` with valid payload returns 200/201 and triggers `recordBuildComplete` internally.
        *   `POST /build/complete` when `canMarkBuildDone` returns false (simulating RED health) returns 409.
    *   **Manual Verification:** Use `curl` or a similar tool to hit the new endpoints and observe responses and system behavior (e.g., log entries for build state changes).
    *   **Log Monitoring:** Confirm that `recordBuildStart` and `recordBuildComplete` actions are logged correctly in BuilderOS system logs.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If unit or integration tests for the new routes fail.
    *   If API calls to `/build/start` or `/build/complete` return unexpected HTTP status codes or payloads.
    *   If `recordBuildStart` or `recordBuildComplete` actions are not observed in BuilderOS logs after successful API calls.
    *   If the 409 Conflict status is not returned when `canMarkBuildDone` indicates a failure under RED health conditions.
    *   If any unintended side effects are observed on existing BuilderOS functionality or any LifeOS user features/TSOS customer-facing surfaces.