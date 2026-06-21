<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G13-100 Remediation -->

# Amendment 46: BuilderOS Control Plane Proof - G13-100 Remediation

This document outlines the remediation plan for the BuilderOS control plane wiring, specifically addressing the integration points within `routes/lifeos-council-builder-routes.js` as identified by the OIL verifier rejection signal.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of robust API endpoints within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle events:
- **Build Start:** A `POST` endpoint to internally record the initiation of a build process, requiring `task_id`, `blueprint_id`, and `model_used`.
- **Build Complete:** A `POST` endpoint to internally record the completion of a build, requiring a build token and OIL receipt IDs. This endpoint must also incorporate a health check (`canMarkBuildDone`) to prevent completion under critical system health conditions.

The current implementation lacks these specific route definitions and their corresponding service integrations, leading to an incomplete control plane for BuilderOS loop execution.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to introduce two new `POST` routes and their associated logic:

- **`POST /build/start`**:
    - Accepts `task_id`, `blueprint_id`, `model_used` in the request body.
    - Calls an internal `buildService.recordBuildStart` function with these parameters.
    - Returns a success response (e.g., 200/204).

- **`POST /build/complete`**:
    - Accepts a `token` and `oil_receipt_ids` in the request body.
    - Before proceeding, calls `buildService.canMarkBuildDone()` to check system health.
    - If `canMarkBuildDone()` returns `false` (indicating RED health), it immediately returns a `409 Conflict` status.
    - If `canMarkBuildDone()` returns `true`, it calls an internal `buildService.recordBuildComplete` function with the token and receipt IDs.
    - Returns a success response (e.g., 200/204).

This slice focuses solely on the route definitions and their direct service calls, assuming `buildService` and `healthService` (or equivalent) exist and provide the necessary internal functions.

## 3. Exact Safe-Scope Files to Touch First

- `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new `POST` endpoints and their handler logic.
- `services/buildService.js` (if `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` are not fully implemented or need parameter adjustments).
- `services/healthService.js` (if `canMarkBuildDone` relies on a specific health check function not yet exposed or implemented).

For this specific remediation, the primary focus is on `routes/lifeos-council-builder-routes.js` to establish the API surface.

## 4. Verifier/Runtime Checks

To validate the implementation:

- **Unit Tests (`routes/lifeos-council-builder-routes.test.js`):**
    - Verify `POST /build/start` successfully invokes `buildService.recordBuildStart` with correct arguments.
    - Verify `POST /build/complete` successfully invokes `buildService.recordBuildComplete` with correct arguments when `canMarkBuildDone` is true.
    - Verify `POST /build/complete` returns `409 Conflict` when `buildService.canMarkBuildDone` is false.
    - Verify `POST /build/complete` returns a success status (e.g., 200/204) when `buildService.canMarkBuildDone` is true.
- **Integration Tests:**
    - Deploy to a staging environment.
    - Send `POST /build/start` requests and confirm corresponding build start records are created in the system.
    - Send `POST /build/complete` requests under healthy conditions and confirm build completion records and OIL receipt processing.
    - Artificially set system health to RED (or simulate `canMarkBuildDone` returning false) and send `POST /build/complete` requests, verifying a `409 Conflict` response.
- **Runtime Monitoring:**
    - Observe application logs for successful invocation of `recordBuildStart` and `recordBuildComplete`.
    - Monitor API gateway metrics for `POST /build/start` and `POST /build/complete` endpoints, specifically looking at response codes (2xx, 409).

## 5. Stop Conditions if Runtime Truth Disagrees

The remediation should be halted and re-evaluated if any of the following conditions are met:

- `POST /build/start` or `POST /build/complete` endpoints are not reachable or consistently return unexpected HTTP status codes (e.g., 404, 500) in a functional environment.
- The internal `buildService.recordBuildStart` or `buildService.recordBuildComplete` functions are not invoked as expected, or they fail silently/with unhandled errors.
- The `buildService.canMarkBuildDone` check does not correctly gate the `POST /build/complete` endpoint, allowing builds to complete under RED health conditions or incorrectly blocking them when healthy.
- The OIL verifier continues to reject the build, specifically citing issues related to the BuilderOS control plane wiring, indicating the underlying functional gap has not been adequately closed.
- Any observed side effects impacting LifeOS user features or TSOS customer-facing surfaces, as these are out of scope for BuilderOS-only modifications.