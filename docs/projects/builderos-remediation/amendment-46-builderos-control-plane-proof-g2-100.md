Amendment 46: BuilderOS Control Plane Proof Gap 2-100

Proof-Closing Blueprint Note

This note addresses the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46. The focus is on establishing endpoints for build start and completion, incorporating necessary validation and health checks.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of concrete route definitions and corresponding controller logic within `routes/lifeos-council-builder-routes.js` to handle the BuilderOS build lifecycle events. Specifically:
- A `POST` endpoint for `/build/start` to trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
- A `POST` endpoint for `/build/complete` to trigger `recordBuildComplete` with a build token and OIL receipt IDs.
- Integration of a `canMarkBuildDone` check before `recordBuildComplete`, returning a 409 status if the check fails due to a RED health status.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Defining two new `POST` routes in `routes/lifeos-council-builder-routes.js`.
2.  Implementing or extending a BuilderOS-specific controller (e.g., `builderCouncilController`) to contain `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` logic.
3.  Ensuring `canMarkBuildDone` correctly assesses health status (e.g., via an internal health service) and returns a boolean.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: Add new `POST` route definitions.
-   `controllers/builder-council-controller.js` (or similar existing BuilderOS controller): Implement `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.
-   `services/builder-health-service.js` (or similar): If `canMarkBuildDone` requires external health checks, ensure this service provides the necessary health status.

### 4. Verifier/Runtime Checks

-   **Unit Tests:**
    -   `builderCouncilController.recordBuildStart`: Verify correct data parsing and internal service calls.
    -   `builderCouncilController.recordBuildComplete`: Verify token and receipt ID handling, and `canMarkBuildDone` interaction.
    -   `builderCouncilController.canMarkBuildDone`: Verify health status evaluation logic.
-   **Integration Tests:**
    -   `POST /build/start`: Send valid payload, expect 200/202. Verify internal state/DB updates.
    -   `POST /build/complete`: Send valid payload (token, receipt IDs), expect 200/202. Verify internal state/DB updates.
    -   `POST /build/complete` (Health RED): Simulate RED health status, send valid payload, expect 409.
-   **Manual Verification (via `curl` or Postman):**
    -   `curl -X POST -H "Content-Type: application/json" -d '{"task_id": "t123", "blueprint_id": "b456", "model_used": "g2-100"}' http://localhost:PORT/build/start`
    -   `curl -X POST -H "Content-Type: application/json" -d '{"token": "build_token_xyz", "oil_receipt_ids": ["oil1", "oil2"]}' http://localhost:PORT/build/complete` (and test with health RED scenario)

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` or `POST /build/complete` routes are not found (404) or return unexpected HTTP status codes (e.g., 500 for valid input).
-   If `recordBuildStart` or `recordBuildComplete` fail to correctly update the BuilderOS internal state or persist data.
-   If `canMarkBuildDone` does not correctly prevent build completion when the system health is RED, or incorrectly blocks completion when health is GREEN.
-   If any existing BuilderOS control plane functionality or LifeOS user features are inadvertently affected.