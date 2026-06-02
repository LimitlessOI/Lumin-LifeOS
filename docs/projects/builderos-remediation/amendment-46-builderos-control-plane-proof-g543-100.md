# Amendment 46: BuilderOS Control Plane Proof - G543-100 Remediation

This document addresses the OIL verifier rejection for Amendment 46, specifically focusing on the required wiring within `routes/lifeos-council-builder-routes.js` to establish the BuilderOS control plane loop execution.

## Proof-Closing Blueprint Note

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of concrete route handlers within `routes/lifeos-council-builder-routes.js` for the `/build` start and complete lifecycle events. This includes:
- A `POST /build/start` endpoint to trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
- A `POST /build/complete` endpoint to trigger `recordBuildComplete` with a build token and OIL receipt IDs.
- Conditional logic within the `/build/complete` handler to check `canMarkBuildDone` and return a 409 status if the health is RED.

These handlers are crucial for the BuilderOS-only governed loop execution and were not fully implemented in the previous pass, leading to the verifier rejection (though the verifier's specific error was a syntax issue with `.md` file processing, the underlying functional gap remains).

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding the necessary `router.post` definitions and their corresponding asynchronous handler functions to `routes/lifeos-council-builder-routes.js`. This will include:
- Importing required internal service functions (e.g., `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`).
- Implementing the request body parsing and parameter extraction for each endpoint.
- Calling the respective internal functions and handling their responses, including the 409 condition.

### 3. Exact Safe-Scope Files to Touch First

- `routes/lifeos-council-builder-routes.js` (primary modification target)
- Potentially, a new or existing internal service file (e.g., `services/builder-control-plane-service.js`) if `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not yet defined or need to be consolidated. For this pass, we assume these functions are available from a `builderControlPlaneService` module.

### 4. Verifier/Runtime Checks

**Verifier Checks:**
- **Static Analysis:** Confirm `routes/lifeos-council-builder-routes.js` compiles without syntax errors. Verify that `router.post('/build/start', ...)` and `router.post('/build/complete', ...)` are correctly defined.
- **Dependency Resolution:** Ensure `builderControlPlaneService` and its methods are correctly imported and referenced.
- **Error Handling:** Verify the presence of `try...catch` blocks or equivalent error handling for asynchronous operations.

**Runtime Checks:**
- **`POST /build/start` Endpoint:**
    - Send a `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, `model_used`. Expect a 200/202 status.
    - Verify internal logs confirm `recordBuildStart` was called with the correct parameters.
    - Send a `POST` request with missing/invalid parameters. Expect a 400 status.
- **`POST /build/complete` Endpoint (Health GREEN):**
    - Simulate `canMarkBuildDone` returning `true` (health GREEN).
    - Send a `POST` request to `/build/complete` with a valid `token` and `OIL receipt IDs`. Expect a 200/202 status.
    - Verify internal logs confirm `recordBuildComplete` was called with the correct parameters.
- **`POST /build/complete` Endpoint (Health RED):**
    - Simulate `canMarkBuildDone` returning `false` (health RED).
    - Send a `POST` request to `/build/complete` with a valid `token` and `OIL receipt IDs`. Expect a 409 status.
    - Verify `recordBuildComplete` was *not* called in this scenario.
- **Integration Tests:** Develop and execute integration tests covering all success and failure paths for both endpoints.

### 5. Stop Conditions if Runtime Truth Disagrees

- If any `POST /build` endpoint returns an unexpected HTTP status code (e.g., 500 for a valid request, 200 for a health RED scenario).
- If internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are not invoked as expected or throw unhandled exceptions.
- If the 409 conflict for health RED is not consistently triggered or is triggered incorrectly when health is GREEN.
- If logs indicate incorrect parameter passing to internal functions.
- If the application crashes or becomes unstable after deploying these changes.

This remediation focuses on implementing the specified control plane logic within the designated route file, ensuring the BuilderOS loop can be governed effectively.