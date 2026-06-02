Amendment 46 BuilderOS Control Plane Proof - G693-100

This document outlines the proof-closing blueprint note for wiring the BuilderOS control plane within `routes/lifeos-council-builder-routes.js`, as per Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The core gap is the absence of dedicated API endpoints and their corresponding handler logic within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a BuilderOS build. Specifically:
    *   A `POST /build/start` endpoint to initiate a build record, accepting `task_id`, `blueprint_id`, and `model_used`. This endpoint will call an internal `recordBuildStart` function.
    *   A `POST /build/complete` endpoint to finalize a build record, accepting a build token and OIL receipt IDs. This endpoint will call an internal `recordBuildComplete` function.
    *   The integration of a health check mechanism (`canMarkBuildDone`) within the `POST /build/complete` handler. This check must conditionally prevent build completion when the system health is critical (RED state), returning a 409 Conflict status code.
    *   The underlying `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions need to be implemented, likely within a dedicated BuilderOS service or controller.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves:
    *   Adding two new `POST` routes (`/build/start` and `/build/complete`) to `routes/lifeos-council-builder-routes.js`.
    *   Creating a new `builder-service.js` (or extending an existing BuilderOS-specific service) to encapsulate the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` logic.
    *   `recordBuildStart` will persist initial build metadata.
    *   `recordBuildComplete` will update the build record with completion status and OIL receipt IDs.
    *   `canMarkBuildDone` will query the system's health status (e.g., via an existing `health-service`) and return `false` if health is RED, `true` otherwise.
    *   The `POST /build/complete` route handler will invoke `canMarkBuildDone` before attempting to complete the build.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`: Define the new `POST /build/start` and `POST /build/complete` routes.
    *   `services/builder-service.js` (new file or existing BuilderOS service): Implement `recordBuildStart({ task_id, blueprint_id, model_used })`, `recordBuildComplete({ token, oilReceiptIds })`, and `canMarkBuildDone()`.
    *   `services/health-service.js` (existing): Ensure a function exists to query the current system health status, which `canMarkBuildDone` can utilize.

4.  **Verifier/Runtime Checks**
    *   **Unit Tests**:
        *   `builder-service.js`: Verify `recordBuildStart` correctly creates a build entry.
        *   `builder-service.js`: Verify `recordBuildComplete` correctly updates a build entry and associates OIL receipts.
        *   `builder-service.js`: Verify `canMarkBuildDone` returns `false` when `health-service` reports RED, and `true` otherwise.
    *   **Integration Tests (via API calls)**:
        *   `POST /build/start`: Send a request with valid `task_id`, `blueprint_id`, `model_used`. Assert 200 OK and that a build record is initiated in the database.
        *   `POST /build/complete` (Health GREEN/YELLOW): Send a request with a valid build token and OIL receipt IDs. Assert 200 OK and that the build record is marked complete.
        *   `POST /build/complete` (Health RED): Mock `health-service` to report RED. Send a request with a valid build token and OIL receipt IDs. Assert 409 Conflict response.
        *   `POST /build/complete` (Health GREEN/YELLOW): Mock `health-service` to report GREEN. Send a request with a valid build token and OIL receipt IDs. Assert 200 OK.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `POST /build/start` does not successfully create a new build record with the provided metadata.
    *   If `POST /build/complete` returns a success status (2xx) when `canMarkBuildDone` indicates health is RED.
    *   If `POST /build/complete` returns any status other than 409 Conflict when `canMarkBuildDone` indicates health is RED.
    *   If `POST /build/complete` returns 409 Conflict when `canMarkBuildDone` indicates health is GREEN or YELLOW.
    *   If `POST /build/complete` does not correctly update the build record with completion status and OIL receipt IDs upon successful execution.
    *   If any internal service calls (e.g., to the database for build state, or to the OIL system) fail silently or produce incorrect state changes.