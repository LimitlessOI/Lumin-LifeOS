Amendment 46 BuilderOS Control Plane Proof - G431-100

Proof-Closing Blueprint Note: BuilderOS Build Event Wiring

This note addresses the implementation gap for wiring BuilderOS build events within the LifeOS Council Builder routes, as specified in Amendment 46. The goal is to establish the necessary endpoints for recording build start and completion, incorporating health-based control.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` module currently lacks the necessary POST endpoints to handle BuilderOS build start and completion events. Specifically, the following are missing:
- A POST endpoint for `/build/start` to trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
- A POST endpoint for `/build/complete` to trigger `recordBuildComplete` with a build token and OIL receipt IDs. This endpoint must also incorporate a health check using `canMarkBuildDone` and return a 409 Conflict status if the health is RED and the check fails.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new POST route handlers to `routes/lifeos-council-builder-routes.js`. These handlers will:
- Parse incoming request bodies for required parameters.
- Call the respective internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`).
- Handle success responses (200 OK) and specific error conditions (409 Conflict for health-based rejection).

### 3. Exact Safe-Scope Files to Touch First

- `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their corresponding logic.
- `services/builder-service.js` (or equivalent): This file is assumed to contain or will be extended to contain the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. Modifications here would be to ensure these functions are correctly implemented and exposed.

### 4. Verifier/Runtime Checks

**Verifier Checks:**
- Static analysis of `routes/lifeos-council-builder-routes.js` confirms the presence of `POST /build/start` and `POST /build/complete` routes.
- Verification that `recordBuildStart` is called with `task_id`, `blueprint_id`, `model_used`.
- Verification that `recordBuildComplete` is called with `token` and `OIL receipt IDs`.
- Verification that `canMarkBuildDone` is called before `recordBuildComplete` and its failure results in a 409 response.
- No new external dependencies or unauthorized database operations are introduced.

**Runtime Checks:**
- **Scenario 1: Build Start Success**
    - `POST /build/start` with valid `{ task_id: 't123', blueprint_id: 'b456', model_used: 'g4' }` returns `200 OK`.
    - Internal logs confirm `recordBuildStart` was invoked and build start event was recorded.
- **Scenario 2: Build Complete Success**
    - `POST /build/complete` with valid `{ token: 'abc', oil_receipt_ids: ['r1', 'r2'] }` (and `canMarkBuildDone` returns true) returns `200 OK`.
    - Internal logs confirm `recordBuildComplete` was invoked and build completion event was recorded.
- **Scenario 3: Build Complete Health Failure**
    - `POST /build/complete` with valid `{ token: 'abc', oil_receipt_ids: ['r1', 'r2'] }` (and `canMarkBuildDone` returns false due to RED health) returns `409 Conflict`.
    - Internal logs confirm `canMarkBuildDone` was invoked and prevented `recordBuildComplete`.

### 5. Stop Conditions if Runtime Truth Disagrees

- If any of the runtime checks (Scenarios 1, 2, or 3) fail to produce the expected status code or internal logging.
- If the system exhibits unexpected behavior, increased error rates, or performance degradation after deployment of the changes.
- If `recordBuildStart` or `recordBuildComplete` calls result in data corruption or inconsistent state.
- If the `canMarkBuildDone` health check mechanism is bypassed or incorrectly applied.