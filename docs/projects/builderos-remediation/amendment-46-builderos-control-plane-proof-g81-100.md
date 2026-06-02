Amendment 46: BuilderOS Control Plane Proof G81-100

Proof-Closing Blueprint Note: Wiring BuilderOS Control Plane Routes

This note addresses the required follow-through signal for wiring the BuilderOS control plane operations within `routes/lifeos-council-builder-routes.js`. The goal is to integrate build start, build complete, and health-check based build completion gating.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints and associated handler logic to:
-   Receive and process build start signals, invoking `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   Receive and process build completion signals, invoking `recordBuildComplete` with `token` and `OIL receipt IDs`.
-   Enforce a health-based pre-condition for marking a build complete using `canMarkBuildDone`, returning a 409 conflict if the health status is RED.

The internal functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are assumed to exist and be importable from a shared service or utility layer. The routing layer needs to be extended to consume these.

### 2. Smallest Safe Build Slice to Close It

Implement two new POST routes within `routes/lifeos-council-builder-routes.js`:
-   `/build/start`: Accepts `task_id`, `blueprint_id`, `model_used` in the request body.
-   `/build/complete`: Accepts `token` and `oil_receipt_ids` in the request body.

Each route will:
-   Import and utilize the respective internal functions (`recordBuildStart`, `recordBuildComplete`).
-   The `/build/complete` route will additionally call `canMarkBuildDone` before `recordBuildComplete`. If `canMarkBuildDone` returns `false` (indicating RED health), it will respond with a 409 HTTP status code and an appropriate message.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes and their handler logic.
-   `services/builder-control-plane-service.js` (or similar existing service file): Verify `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are correctly exported and accessible. If not, define/export them here.

### 4. Verifier/Runtime Checks

-   **Unit Tests:**
    -   Create unit tests for the new route handlers in `routes/lifeos-council-builder-routes.js` (or a dedicated controller if extracted).
    -   Verify `recordBuildStart` is called with correct parameters on `/build/start` POST.
    -   Verify `recordBuildComplete` is called with correct parameters on `/build/complete` POST when `canMarkBuildDone` passes.
    -   Verify a 409 response is returned on `/build/complete` POST when `canMarkBuildDone` fails (health RED).
-   **Integration Tests:**
    -   Deploy the updated `routes/lifeos-council-builder-routes.js`.
    -   Send POST requests to `/build/start` with sample `task_id`, `blueprint_id`, `model_used`. Assert 200 OK and expected internal logging/state changes.
    -   Send POST requests to `/build/complete` with sample `token` and `oil_receipt_ids`. Assert 200 OK and expected internal logging/state changes when health is GREEN.
    -   Simulate a RED health state (e.g., mock `canMarkBuildDone` to return `false`) and send POST to `/build/complete`. Assert 409 Conflict response.
-   **OIL Verifier Check:** The verifier should successfully process this `.md` file without `ERR_UNKNOWN_FILE_EXTENSION`. This indicates the verifier is correctly identifying the file type and not attempting to execute it as a Node.js module.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If the new `/build/start` or `/build/complete` routes return 404 (Not Found) or 500 (Internal Server Error) for valid requests.
-   If `recordBuildStart` or `recordBuildComplete` are not invoked or fail internally, indicating an import or dependency issue.
-   If the `/build/complete` endpoint does not return a 409 when `canMarkBuildDone` indicates a RED health status.
-   If the OIL verifier continues to reject this `.md` file with a `TypeError [ERR_UNKNOWN_FILE_EXTENSION]`, indicating a persistent issue with the verifier's file type handling for documentation. This would require a separate investigation into the verifier's configuration.