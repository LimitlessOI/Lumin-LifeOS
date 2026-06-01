Amendment 46: BuilderOS Control Plane Proof - G29-100
Proof-Closing Blueprint Note

This note addresses the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

1. Exact Missing Implementation or Proof Gap
The primary gap is the absence of specific route handlers in `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle events. Specifically:
- A `POST` endpoint for `/build/start` (or similar) that calls the internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
- A `POST` endpoint for `/build/complete` (or similar) that calls the internal `recordBuildComplete` function with `token` and `OIL receipt IDs`.
- The `/build/complete` endpoint must also include a check using `canMarkBuildDone`. If `canMarkBuildDone` fails (e.g., when health is RED), the endpoint must return a `409 Conflict` status.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
- **Route Definition:** Adding two new `POST` routes (e.g., `/build/start` and `/build/complete`) to `routes/lifeos-council-builder-routes.js`.
- **Handler Logic for Build Start:** Implementing the handler for `/build/start` to extract `task_id`, `blueprint_id`, and `model_used` from the request body and pass them to `recordBuildStart`.
- **Handler Logic for Build Complete:** Implementing the handler for `/build/complete` to extract the necessary `token` and `OIL receipt IDs` from the request body.
- **Health Check Integration:** Before calling `recordBuildComplete`, invoke `canMarkBuildDone`. If it returns `false` or indicates a failure state, respond with `409 Conflict`. Otherwise, proceed to call `recordBuildComplete`.
- **Dependency Imports:** Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are correctly imported from their respective service modules (e.g., `../services/builder-control-service.js`).

3. Exact Safe-Scope Files to Touch First
- `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their corresponding handler logic.
- `services/builder-control-service.js` (or similar existing service file): This file is assumed to contain the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If these functions are stubs or missing, they would need to be implemented here, but the current task focuses on wiring them.

4. Verifier/Runtime Checks
- **Unit Tests:**
    - Verify `POST /build/start` correctly calls `recordBuildStart` with the expected payload.
    - Verify `POST /build/complete` correctly calls `recordBuildComplete` with the expected `token` and `OIL receipt IDs`.
    - Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` indicates a failure (e.g., health RED).
    - Verify `POST /build/complete` returns a success status (e.g., 200/204) when `canMarkBuildDone` passes.
- **Integration Tests:**
    - Simulate a full build lifecycle (start, then complete) and observe the system state (e.g., database entries, logs) to confirm `recordBuildStart` and `recordBuildComplete` had the intended effects.
    - Test the failure path by simulating a RED health state for `canMarkBuildDone` and confirming the 409 response.
- **Manual Verification:**
    - Use `curl` or Postman to send `POST` requests to `/build/start` and `/build/complete` with valid and invalid payloads, observing HTTP responses and system side effects.

5. Stop Conditions if Runtime Truth Disagrees
- If `routes/lifeos-council-builder-routes.js` cannot be modified or extended due to unforeseen architectural constraints.
- If `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` functions are not found, cannot be imported, or have incompatible signatures.
- If the new routes result in unexpected HTTP status codes (e.g., 404, 500) instead of the intended 200/204/409.
- If the internal state recorded by `recordBuildStart` or `recordBuildComplete`