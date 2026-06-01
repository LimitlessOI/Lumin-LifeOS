# Amendment 46 BuilderOS Control Plane Proof - G9-100 Remediation

This document outlines the remediation plan for the BuilderOS control plane changes, addressing the OIL verifier rejection and detailing the next implementation steps.

## OIL Verifier Rejection Analysis

The verifier rejection `TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".md"` indicates a misconfiguration in the verifier's execution environment, where it attempted to parse this Markdown blueprint note as a JavaScript module. This is not a defect in the content of this document but rather in the verifier's processing of non-code artifacts. The immediate action is to provide the correct blueprint note content and proceed with the outlined implementation.

## Proof-Closing Blueprint Note

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of wired endpoints in `routes/lifeos-council-builder-routes.js` to handle build start and completion events, along with the necessary internal function calls and health checks. Specifically:
-   `POST /build/start`: Missing handler to call `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   `POST /build/complete`: Missing handler to call `recordBuildComplete` with `token` and `OIL receipt IDs`, and to enforce a 409 conflict response if `canMarkBuildDone` fails (health RED).

### 2. Smallest Safe Build Slice to Close It

1.  **Define `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`:** Ensure these internal functions are accessible within the scope of `routes/lifeos-council-builder-routes.js`. If they reside in a separate service or utility file, import them. If they are new, define minimal stub implementations for initial integration.
2.  **Implement `POST /build/start` handler:**
    -   Accept `task_id`, `blueprint_id`, `model_used` from the request body.
    -   Call `recordBuildStart` with these parameters.
    -   Return a success response (e.g., 202 Accepted).
3.  **Implement `POST /build/complete` handler:**
    -   Accept `token` and `OIL receipt IDs` from the request body.
    -   **Pre-check:** Call `canMarkBuildDone()`. If it returns `false` (indicating health RED), immediately return a 409 Conflict response.
    -   Call `recordBuildComplete` with the provided `token` and `OIL receipt IDs`.
    -   Return a success response (e.g., 202 Accepted).

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will contain the new route definitions and their handlers.
-   `services/builder-control-plane.js` (or similar existing internal service): If `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not yet defined, this would be the appropriate place to implement them as internal BuilderOS functions. For this build slice, assume they are either imported or stubbed within the route file for rapid iteration.

### 4. Verifier/Runtime Checks

-   **Unit Tests:**
    -   Verify `POST /build/start` calls `recordBuildStart` with correct arguments.
    -   Verify `POST /build/complete` calls `recordBuildComplete` with correct arguments when `canMarkBuildDone` passes.
    -   Verify `POST /build/complete` returns 409 when `canMarkBuildDone` fails.
    -   Verify `POST /build/complete` does *not* call `recordBuildComplete` when `canMarkBuildDone` fails.
-   **Integration Tests (via BuilderOS loop simulation):**
    -   Successfully initiate a build via BuilderOS, observing a `POST /build/start` call and corresponding `recordBuildStart` log.
    -   Successfully complete a build via BuilderOS, observing a `POST /build/complete` call and corresponding `recordBuildComplete` log.
    -   Simulate a "health RED" state for BuilderOS and attempt to complete a build; verify a 409 response from `POST /build/complete` and no `recordBuildComplete` call.
-   **Logging:** Monitor application logs for `recordBuildStart` and `recordBuildComplete` invocations and any error conditions.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` or `POST /build/complete` routes return 404 or other unexpected HTTP status codes.
-   If `recordBuildStart` or `recordBuildComplete` are not invoked as expected, or are invoked with incorrect parameters.
-   If `POST /build/complete` allows a build to complete (returns 2xx) when `canMarkBuildDone` indicates a health RED state.
-   If `POST /build/complete` incorrectly returns 409 when `canMarkBuildDone` indicates a healthy state.
-   If the BuilderOS loop fails to progress due to issues with these new endpoints.