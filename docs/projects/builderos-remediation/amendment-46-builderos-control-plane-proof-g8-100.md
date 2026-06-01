# Amendment 46: BuilderOS Control Plane Proof - G8-100 Remediation

This document outlines the remediation plan for the BuilderOS control plane, specifically addressing the integration of build start and completion signals within `routes/lifeos-council-builder-routes.js` as per the OIL verifier rejection.

---

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file requires new POST endpoints to:
- Record the start of a build process.
- Record the completion of a build process, including a health check for marking completion.

Specifically, the following functionality is missing:
- A `POST /build/start` endpoint to invoke an internal `recordBuildStart` function with `task_id`, `blueprint_id`, and `model_used`.
- A `POST /build/complete` endpoint to invoke an internal `recordBuildComplete` function with a token and OIL receipt IDs.
- The `POST /build/complete` endpoint must also check `canMarkBuildDone()` and return a `409 Conflict` status if this check fails (e.g., when system health is RED).

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to add the two specified POST routes and their associated logic. This includes:
- Defining the route handlers.
- Importing or defining the internal `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions (assuming they exist in a related builder service module).
- Implementing the conditional 409 response for `canMarkBuildDone` failure.

### 3. Exact Safe-Scope Files to Touch First

- `routes/lifeos-council-builder-routes.js`: This is the primary file to be modified to add the new routes and their handlers.
- `services/builder-control-plane.js` (or similar existing builder service): This file would likely contain the implementations for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If these do not exist, they would be added here.

### 4. Verifier/Runtime Checks

**Unit/Integration Tests:**
- **`POST /build/start`:**
    - Verify that a `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, and `model_used` returns a `200 OK` or `202 Accepted` status.
    - Assert that `recordBuildStart` is called exactly once with the correct payload.
- **`POST /build/complete`:**
    - Verify that a `POST` request to `/build/complete` with a valid token and OIL receipt IDs returns a `200 OK` or `202 Accepted` status when `canMarkBuildDone()` returns `true`.
    - Assert that `recordBuildComplete` is called exactly once with the correct payload.
    - Verify that a `POST` request to `/build/complete` returns a `409 Conflict` status when `canMarkBuildDone()` returns `false` (e.g., health RED).
    - Assert that `recordBuildComplete` is *not* called when `canMarkBuildDone()` returns `false`.

**Runtime Monitoring:**
- Monitor application logs for successful invocations of `recordBuildStart` and `recordBuildComplete` during actual build processes.
- Observe HTTP response codes for `/build/complete` endpoint, specifically looking for `409` responses when the system is in a RED health state, and `200/202` responses otherwise.
- Ensure no regressions or unexpected behavior are introduced to existing BuilderOS or LifeOS functionalities.

### 5. Stop Conditions if Runtime Truth Disagrees

- If `recordBuildStart` or `recordBuildComplete` are not invoked or are invoked with incorrect parameters during a build lifecycle.
- If the `/build/complete` endpoint consistently returns `200/202` when `canMarkBuildDone()` should be failing (health RED), or conversely, returns `409` when it should succeed.
- If the introduction of these routes causes any degradation or unexpected behavior in other BuilderOS control plane operations or LifeOS user features.
- If the `canMarkBuildDone` logic is found to be incorrectly implemented or its health check mechanism is unreliable, requiring a re-evaluation of the health signaling.