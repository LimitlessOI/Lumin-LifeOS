# Amendment 46: BuilderOS Control Plane Proof (G39-100) Remediation

## Proof-Closing Blueprint Note

This document outlines the remediation plan for the BuilderOS control plane wiring, addressing the OIL verifier rejection. The core issue is the missing implementation of the `/build` endpoint within `routes/lifeos-council-builder-routes.js` to correctly manage build start and completion events, including health-based pre-conditions.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file lacks the necessary Express route definitions and middleware to:
-   Handle `POST /build` for build start events, calling `recordBuildStart`.
-   Handle `POST /build` for build completion events, calling `recordBuildComplete`.
-   Integrate `canMarkBuildDone` and `getSystemHealth` to enforce a 409 conflict response when a build completion is attempted under a RED system health status and `canMarkBuildDone` fails.

The existing file content provided in the rejection was a partial JavaScript import block, not a functional route implementation.

### 2. Smallest Safe Build Slice to Close It

Implement a single `POST /build` route in `routes/lifeos-council-builder-routes.js` that intelligently dispatches to `recordBuildStart` or `recordBuildComplete` based on the request payload, and incorporates the health check logic.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`

### 4. Verifier/Runtime Checks

1.  **Build Start Verification:**
    -   **Action:** Send `POST /build` with a payload indicating a build start (e.g., `{ type: 'start', task_id: '...', blueprint_id: '...', model_used: '...' }`).
    -   **Expected Outcome:** `recordBuildStart` service function is invoked with the correct `task_id`, `blueprint_id`, and `model_used`. The route returns a 2xx success status.

2.  **Build Complete Success Verification:**
    -   **Action:** Ensure `getSystemHealth()` returns GREEN or `canMarkBuildDone()` returns true. Send `POST /build` with a payload indicating build completion (e.g., `{ type: 'complete', token: '...', oil_receipt_ids: [...] }`).
    -   **Expected Outcome:** `recordBuildComplete` service function is invoked with the correct `token` and `oil_receipt_ids`. The route returns a 2xx success status.

3.  **Build Complete Health Check Failure Verification:**
    -   **Action:** Configure the system such that `getSystemHealth()` returns RED and `canMarkBuildDone()` returns false. Send `POST /build` with a payload indicating build completion.
    -   **Expected Outcome:** The route returns a `409 Conflict` status code. `recordBuildComplete` should *not* be invoked.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart` is not called for a build start request.
-   If `recordBuildComplete` is called when `canMarkBuildDone` fails and health is RED.
-   If a `409 Conflict` is not returned when `canMarkBuildDone` fails and health is RED for a build complete request.
-   If a 2xx status is not returned for successful build start or complete requests.
-   If the parameters passed to `recordBuildStart` or `recordBuildComplete` are incorrect.

This plan provides a clear, implementation-first approach to close the identified proof gap and prepare for the next C2 build pass.