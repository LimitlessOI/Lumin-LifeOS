Amendment 46 BuilderOS Control Plane Proof - G663-100

This document outlines the proof-closing blueprint note for Amendment 46, focusing on the BuilderOS control plane wiring within `routes/lifeos-council-builder-routes.js`.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated `POST` endpoints within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. Specifically:
- A `POST /build/start` endpoint to trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
- A `POST /build/complete` endpoint to trigger `recordBuildComplete` with a build token and OIL receipt IDs.
- The integration of a health check (`canMarkBuildDone`) within the `/build/complete` flow to return a `409 Conflict` status when the system health is RED.
- The underlying `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are either missing or not correctly exposed/integrated.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
- **Route Definition:** Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`.
- **Controller/Service Logic:** Implementing or extending a BuilderOS-specific controller/service (e.g., `controllers/builder-control-plane-controller.js` or `services/builder-control-plane-service.js`) to encapsulate `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.
- **Health Check Integration:** Ensuring `canMarkBuildDone` is called before `recordBuildComplete` and its result dictates the HTTP response for `/build/complete`.

### 3. Exact Safe-Scope Files to Touch First

- `routes/lifeos-council-builder-routes.js`: To define the new `POST /build/start` and `POST /build/complete` endpoints.
- `controllers/builder-control-plane-controller.js` (or similar existing BuilderOS controller): To implement the handler functions for the new routes, including calls to `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.
- `services/builder-control-plane-service.js` (or similar existing BuilderOS service): To house the core business logic for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`, ensuring separation of concerns.
- `utils/health-check.js` (or similar): To ensure `canMarkBuildDone` can accurately query system health.

### 4. Verifier/Runtime Checks

- **Unit Tests:**
    - Verify `recordBuildStart` correctly processes and persists `task_id`, `blueprint_id`, `model_used`.
    - Verify `recordBuildComplete` correctly processes `token` and `OIL receipt IDs`.
    - Verify `canMarkBuildDone` returns `true` when health is GREEN/YELLOW and `false` when health is RED.
- **Integration Tests:**
    - `POST /build/start` with valid payload returns `200 OK` or `201 Created` and logs the start event.
    - `POST /build/complete` with valid payload returns `200 OK` or `201 Created` and logs the completion event.
    - `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` indicates RED health.
- **Manual Verification:**
    - Trigger a build via BuilderOS and observe network calls to `/build/start` and `/build/complete`.
    - Manually set system health to RED and attempt to complete a build, verifying the `409 Conflict` response.
    - Monitor BuilderOS logs for successful build start/complete records.

### 5. Stop Conditions if Runtime Truth Disagrees

- If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., `404 Not Found`, `500 Internal Server Error`).
- If `recordBuildStart` or `recordBuildComplete` do not correctly update the build state or persist required metadata in the BuilderOS database.
- If the `409 Conflict` response for `canMarkBuildDone` failure is not consistently triggered when system health is RED, or if it triggers incorrectly when health is GREEN.
- If any existing BuilderOS control plane functionality or LifeOS user features are inadvertently impacted or broken by these changes.