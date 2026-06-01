The instruction to write a `.md` file contradicts the OIL verifier's rejection of a `.md` file due to an attempt to execute it.
# Amendment 46: BuilderOS Control Plane Proof - G30-100 Remediation

This document outlines the remediation plan for the BuilderOS control plane, specifically addressing the integration of build lifecycle events within `routes/lifeos-council-builder-routes.js` as per the Amendment 46 blueprint.

## 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` module requires new or extended POST endpoints to manage the BuilderOS build lifecycle:
-   A `POST /build/start` endpoint to internally invoke `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   A `POST /build/complete` endpoint to internally invoke `recordBuildComplete` with a build token and OIL receipt IDs.
-   The `POST /build/complete` endpoint must also incorporate a health check, returning a `409 Conflict` status if `canMarkBuildDone()` fails (e.g., when BuilderOS health is RED).

These internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are assumed to be available for import and use within the `lifeos-council-builder-routes.js` context.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to:
1.  Define or extend a `POST /build/start` route handler.
2.  Define or extend a `POST /build/complete` route handler.
3.  Implement the conditional `409` response based on `canMarkBuildDone()` within the `/build/complete` handler.
4.  Ensure proper parameter extraction from the request body for `task_id`, `blueprint_id`, `model_used`, build token, and OIL receipt IDs.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`

## 4. Verifier/Runtime Checks

### Unit Tests
-   **`POST /build/start`:**
    -   Verify that a request to `/build/start` with valid `task_id`, `blueprint_id`, and `model_used` in the body results in a successful response (e.g., 200/202) and triggers a call to `recordBuildStart` with the correct arguments.
    -   Verify error handling for missing or invalid parameters.
-   **`POST /build/complete`:**
    -   Verify that a request to `/build/complete` with a valid token and OIL receipt IDs, when `canMarkBuildDone()` returns true, results in a successful response and triggers a call to `recordBuildComplete` with the correct arguments.
    -   Verify that a request to `/build/complete` with a valid token and OIL receipt IDs, when `canMarkBuildDone()` returns false (simulating RED health), results in a `409 Conflict` response and does *not* trigger `recordBuildComplete`.
    -   Verify error handling for missing or invalid parameters.

### Integration Tests
-   **End-to-End Build Flow:**
    -   Simulate a complete BuilderOS build cycle:
        1.  Initiate a build via `POST /build/start`.
        2.  Simulate build processing.
        3.  Attempt to complete the build via `POST /build/complete` with health GREEN.
        4.  Verify successful completion and internal state updates.
    -   **Health-Blocked Completion:**
        1.  Initiate a build via `POST /build/start`.
        2.  Simulate build processing.
        3.  Set BuilderOS health to RED (mock `canMarkBuildDone` to return false).
        4.  Attempt to complete the build via `POST /build/complete`.
        5.  Verify `409 Conflict` response.
        6.  Reset health to GREEN and re-attempt completion; verify success.

### Runtime Monitoring
-   Monitor BuilderOS control plane logs for successful invocation of `recordBuildStart` and `recordBuildComplete` during actual build operations.
-   Observe HTTP response codes for `/build/complete` under various health conditions in a staging environment.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart` or `recordBuildComplete` are not invoked or are invoked with incorrect parameters during a successful build lifecycle.
-   If `POST /build/complete` returns a