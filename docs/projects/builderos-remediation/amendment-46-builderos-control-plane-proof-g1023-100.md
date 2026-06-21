<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G1023-100 -->

# Amendment 46: BuilderOS Control Plane Proof - G1023-100

This document outlines the proof-closing blueprint note for wiring the BuilderOS control plane routes in `routes/lifeos-council-builder-routes.js`, as specified by Amendment 46.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a BuilderOS build process. Specifically:
- A `POST /build/start` endpoint to initiate and record the start of a build.
- A `POST /build/complete` endpoint to finalize and record the completion of a build, including handling health-based pre-conditions.

These endpoints require integration with internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) which are either missing or not yet exposed via the API layer.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  **Route Definition:** Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
2.  **Service Integration:**
    *   The `/build/start` route will call an internal `builderControlService.recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   The `/build/complete` route will first check `builderControlService.canMarkBuildDone()` in conjunction with the system's health status. If `canMarkBuildDone` fails and health is RED, it will return a 409 Conflict. Otherwise, it will call `builderControlService.recordBuildComplete({ token, oilReceiptIds })`.
3.  **Error Handling:** Implementing basic error handling for service calls and input validation.

## 3. Exact Safe-Scope Files to Touch First

The following files are within the safe scope and should be touched first:

-   `routes/lifeos-council-builder-routes.js`: To define the new API endpoints.
-   `services/builderControlService.js` (or similar existing builder-related service): To implement or extend `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. This service will encapsulate the core business logic for build state management and health checks.
-   `utils/healthService.js` (or similar existing health utility): To provide the current system health status, which `canMarkBuildDone` will consume.

## 4. Verifier/Runtime Checks

To verify the implementation:

1.  **`POST /build/start` Success:**
    *   Send a `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, and `model_used`.
    *   Verify a 200 OK response.
    *   Check internal logs/database to confirm `recordBuildStart` was called and the build start event was recorded correctly.
2.  **`POST /build/complete` Success (Green Health):**
    *   Ensure system health is GREEN (or not RED).
    *   Send a `POST` request to `/build/complete` with a valid `token` and `oilReceiptIds`.
    *   Verify a 200 OK response.
    *   Check internal logs/database to confirm `recordBuildComplete` was called and the build completion event was recorded.
3.  **`POST /build/complete` Failure (Red Health + `canMarkBuildDone` fails):**
    *   Artificially set system health to RED and configure `builderControlService.canMarkBuildDone()` to return `false`.
    *   Send a `POST` request to `/build/complete`.
    *   Verify a 409 Conflict response.
    *   Verify `recordBuildComplete` was *not* called.
4.  **`POST /build/complete` Success (Red Health + `canMarkBuildDone` passes):**
    *   Artificially set system health to RED but configure `builderControlService.canMarkBuildDone()` to return `true`.
    *   Send a `POST` request to `/build/complete`.
    *   Verify a 200 OK response.
    *   Verify `recordBuildComplete` was called.
5.  **Input Validation:** Test with invalid/missing parameters for both endpoints to ensure appropriate 400 Bad Request responses.

## 5. Stop Conditions