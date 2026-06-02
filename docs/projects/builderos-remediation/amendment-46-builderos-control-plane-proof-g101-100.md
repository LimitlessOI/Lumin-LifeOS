# Amendment 46 BuilderOS Control Plane Proof - G101-100 Remediation

## Proof-Closing Blueprint Note

This document addresses the required wiring for the BuilderOS control plane within `routes/lifeos-council-builder-routes.js` to enable proper build lifecycle management and health-based completion gating.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the `/build` endpoint within `routes/lifeos-council-builder-routes.js` to integrate with the BuilderOS control plane functions for build start and completion, and to enforce health-based completion checks.

Specifically:
*   The `POST /build/start` route is missing the invocation of `recordBuildStart({ task_id, blueprint_id, model_used })`.
*   The `POST /build/complete` route is missing the invocation of `recordBuildComplete` with the provided token and OIL receipt IDs.
*   The `POST /build/complete` route is missing the conditional check using `canMarkBuildDone` to return a 409 status code if the health is RED and completion is not allowed.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to:
1.  Import the necessary control plane functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`).
2.  Add or modify the `POST /build/start` handler to parse `task_id`, `blueprint_id`, and `model_used` from the request body and pass them to `recordBuildStart`.
3.  Add or modify the `POST /build/complete` handler to parse the token and OIL receipt IDs from the request body and pass them to `recordBuildComplete`.
4.  Within the `POST /build/complete` handler, implement a check using `canMarkBuildDone`. If `canMarkBuildDone` returns `false` (indicating RED health preventing completion), respond with a 409 Conflict status.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`

### 4. Verifier/Runtime Checks

*   **Unit/Integration Tests:**
    *   Verify `POST /build/start` successfully calls `recordBuildStart` with correct parameters.
    *   Verify `POST /build/complete` successfully calls `recordBuildComplete` with correct parameters when `canMarkBuildDone` is true.
    *   Verify `POST /build/complete` returns a 409 status code when `canMarkBuildDone` is false (simulating RED health).
    *   Verify `POST /build/complete` returns a 2xx status code when `canMarkBuildDone` is true (simulating GREEN health).
*   **Runtime Monitoring:**
    *   Observe BuilderOS logs for successful `recordBuildStart` and `recordBuildComplete` invocations during build lifecycle events.
    *   Monitor HTTP access logs for `routes/lifeos-council-builder-routes.js` to confirm expected 2xx responses for successful completions and 409 responses when health is RED.
    *   Confirm that BuilderOS build states transition correctly after these API calls.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `recordBuildStart` or `recordBuildComplete` are not consistently invoked or receive incorrect parameters during build events.
*   If `POST /build/complete` does not return a 409 status when the system health is RED and `canMarkBuildDone` is expected to return `false`.
*   If `POST /build/complete` returns a 409 status when the system health is GREEN and `canMarkBuildDone` is expected to return `true`.
*   If BuilderOS build state transitions are incorrect or stalled despite successful API calls.