# Amendment 46 BuilderOS Control Plane Proof (G138-100)

This document outlines the remediation plan and proof for closing the identified gap in Amendment 46, specifically concerning the BuilderOS control plane's interaction with build lifecycle events and health checks.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the `/build` endpoint within `routes/lifeos-council-builder-routes.js` to fully integrate with the BuilderOS control plane's build lifecycle management and health-based completion gating. Specifically, the `POST /build` route needs to:
-   Initiate a build record via `recordBuildStart` upon receiving a build request.
-   Finalize a build record via `recordBuildComplete` upon successful build completion.
-   Enforce a health-based gate using `canMarkBuildDone` before allowing a build to be marked complete, returning a `409 Conflict` if the system health is not conducive to completion.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to implement the described logic for the `POST /build` endpoint. This includes:
1.  Adding middleware or direct handler logic to call `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used` at the beginning of the build process.
2.  Adding logic to call `recordBuildComplete` with the build `token` and `OIL receipt IDs` upon successful build completion.
3.  Introducing a conditional check using `canMarkBuildDone` before `recordBuildComplete`. If `canMarkBuildDone` returns `false`, the endpoint must respond with a `409 Conflict` status code, preventing the build from being marked complete.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js` (Primary modification target)
-   (Assumed) `services/builder-control-plane-service.js` (Source for `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` functions, if not already imported or defined within the route file's scope).

## 4. Verifier/Runtime Checks

### Unit/Integration Tests:
-   **`POST /build` Start:** Verify that `recordBuildStart` is invoked with the correct parameters (`task_id`, `blueprint_id`, `model_used`) when a build request is initiated.
-   **`POST /build` Complete (Healthy):** Verify that `recordBuildComplete` is invoked with the correct `token` and `OIL receipt IDs` when a build successfully completes and `canMarkBuildDone` returns `true`. The endpoint should return a `200 OK` or `202 Accepted`.
-   **`POST /build` Complete (Unhealthy):** Verify that if `canMarkBuildDone` returns `false` (indicating an unhealthy state), the `POST /build` endpoint returns a `409 Conflict` status code, and `recordBuildComplete` is *not* invoked.
-   **Error Handling:** Ensure robust error handling for all internal service calls.

### Runtime Monitoring:
-   **Log Analysis:** Monitor application logs for successful invocations of `recordBuildStart` and `recordBuildComplete`. Look for specific log entries indicating build state transitions.
-   **HTTP Status Codes:** Observe HTTP response codes for `POST /build`. Confirm `200/202` for successful completions and `409` when health checks prevent completion.
-   **BuilderOS State:** Monitor the BuilderOS control plane's internal state to ensure builds transition correctly from `started` to `completed` (or remain `pending` if health is RED).

## 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be halted and flagged for immediate review if any of the following conditions are observed in runtime or verification:
-   `recordBuildStart` or `recordBuildComplete` are not consistently invoked as per the build lifecycle.
-   The `POST /build` endpoint fails to return a `409 Conflict` when `canMarkBuildDone` indicates an unhealthy state.
-   The `POST /build` endpoint incorrectly returns a `409 Conflict` when `canMarkBuildDone` indicates a healthy state.
-   BuilderOS reports inconsistent build states (e.g., builds marked complete without `recordBuildComplete` or builds stuck in `started` despite successful underlying operations).
-   Any unexpected errors or crashes originating from the modified `routes/lifeos-council-builder-routes.js` or its dependencies.