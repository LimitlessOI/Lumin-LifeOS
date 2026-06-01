# Amendment 46: BuilderOS Control Plane Proof - G26-100 Remediation

This document outlines the remediation plan for the BuilderOS control plane, addressing the OIL verifier rejection and detailing the next C2 build pass.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the `/build` endpoint within `routes/lifeos-council-builder-routes.js` to fully integrate with BuilderOS control plane functions. Specifically:
-   **Build Start**: A `POST` request to `/build` must trigger an internal `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   **Build Complete**: A `POST` request to `/build` (with a completion payload) must trigger `recordBuildComplete` with a build token and OIL receipt IDs.
-   **Health Check**: Before marking a build complete, a check using `canMarkBuildDone` is required. If `canMarkBuildDone` returns false (indicating health RED), the endpoint must return a `409 Conflict` status.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying the existing `/build` route handler in `routes/lifeos-council-builder-routes.js` to:
1.  Parse incoming request bodies to differentiate between build start and build complete signals.
2.  Call the appropriate internal service functions (`recordBuildStart`, `recordBuildComplete`).
3.  Implement the `canMarkBuildDone` check and conditional `409` response for build completion.

This slice focuses solely on the route handler logic and its immediate service function calls.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: Modify to add/update the POST handler for `/build`.
-   `services/builderService.js` (or similar existing service file): Extend to contain or expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.

## 4. Verifier/Runtime Checks

-   **Unit Tests**: Add unit tests for the new route handlers in `routes/lifeos-council-builder-routes.js` to ensure correct payload parsing and service function invocation.
-   **Integration Tests**:
    -   `POST /build` (start payload): Verify successful response (e.g., 200 OK) and `recordBuildStart` invocation.
    -   `POST /build` (complete payload, health GREEN): Verify successful response and `recordBuildComplete` invocation.
    -   `POST /build` (complete payload, health RED): Verify `409 Conflict` response.
-   **Logging**: Monitor application logs for successful invocation of service functions and correct error responses.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` functions are not found or cannot be imported.
-   If the `/build` endpoint does not correctly differentiate between start and complete payloads.
-   If the `409 Conflict` response is not returned when `canMarkBuildDone` indicates health RED.
-   If the route wiring causes existing routes to fail or introduces new syntax errors.
-   If the OIL verifier continues to reject the `.md` file due to `ERR_UNKNOWN_FILE_EXTENSION`, indicating a persistent verifier configuration issue.