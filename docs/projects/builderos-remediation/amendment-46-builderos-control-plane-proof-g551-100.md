Amendment 46 BuilderOS Control Plane Proof - G551-100
This document outlines the proof-closing blueprint note for wiring the BuilderOS control plane routes as specified in Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The primary gap is the implementation and wiring of the `/build` start and complete endpoints within `routes/lifeos-council-builder-routes.js`. This includes:
    *   A `POST /build/start` route to internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   A `POST /build/complete` route to internally call `recordBuildComplete` with a token and OIL receipt IDs.
    *   Conditional logic within `POST /build/complete` to check `canMarkBuildDone` and return a 409 status code if it fails (health RED).
    *   Ensuring `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are correctly imported or defined within the builder control plane context.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to:
    *   Add two new `router.post` handlers for `/build/start` and `/build/complete`.
    *   Implement the request body parsing for `task_id`, `blueprint_id`, `model_used` for `/build/start`.
    *   Implement the request body parsing for `token` and `oil_receipt_ids` for `/build/complete`.
    *   Import or define the necessary internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`).
    *   Add the conditional check for `canMarkBuildDone` before calling `recordBuildComplete` and return `res.status(409).send()` if it fails.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js` (primary modification for route definitions and logic)
    *   `services/builder-control-plane-service.js` (if `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` are defined here and need implementation/stubbing)
    *   `utils/health-check.js` (if `canMarkBuildDone` is a utility function residing here)

4.  **Verifier/Runtime Checks**
    *   **Unit Tests:**
        *   Verify `POST /build/start` handler correctly extracts parameters and calls `recordBuildStart`.
        *   Verify `POST /build/complete` handler correctly extracts parameters and calls `recordBuildComplete` when `canMarkBuildDone` passes.
        *   Verify `POST /build/complete` handler returns 409 when `canMarkBuildDone` fails (health RED).
    *   **Integration Tests:**
        *   Send `POST` requests to `/build/start` with various valid payloads and assert 200/202 responses.
        *   Send `POST` requests to `/build/complete` with valid payloads (token, OIL receipt IDs) under healthy conditions and assert 200/202 responses.
        *   Simulate a RED health state (e.g., mock `canMarkBuildDone` to return false) and send `POST` to `/build/complete`, asserting a 409 response.
        *   Verify that `recordBuildStart` and `recordBuildComplete` trigger expected side effects (e.g., database entries, log messages).
    *   **Runtime Monitoring:**
        *   Monitor API gateway logs for successful 200/202 responses for `/build/start` and `/build/complete`.
        *   Monitor for 409 responses from `/build/complete` during periods of known system health degradation.
        *   Observe internal service logs for `recordBuildStart` and `recordBuildComplete` invocations and their payloads.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `POST /build/start` or `POST /build/complete` consistently return unexpected HTTP status codes (e.g., 500, 400) for valid requests.
    *   If `recordBuildStart` or `recordBuildComplete` are not invoked or record incorrect data despite successful API calls.
    *   If `POST /build/complete` does not return 409 when `canMarkBuildDone` indicates a RED health state.
    *   If the system's overall health or build process state does not reflect the expected changes after successful `recordBuildStart` and `recordBuildComplete` calls.
    *   If the verifier continues to report syntax errors for `.md` files, indicating an environmental issue with the verifier itself rather than the content.