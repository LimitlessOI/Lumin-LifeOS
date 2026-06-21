<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G519-100 -->

# Amendment 46: BuilderOS Control Plane Proof - G519-100

## Proof-Closing Blueprint Note: Wiring `routes/lifeos-council-builder-routes.js`

This note addresses the implementation gap for wiring the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as specified by Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary `POST` endpoints to manage the BuilderOS build lifecycle:
*   A `POST /build/start` endpoint to initiate a build record.
*   A `POST /build/complete` endpoint to finalize a build record, including a health check before completion.

Specifically, the gap is the absence of route definitions and their corresponding handler logic that:
1.  On `POST /build/start`, extracts `task_id`, `blueprint_id`, and `model_used` from the request body and calls an internal `recordBuildStart` function.
2.  On `POST /build/complete`, first calls an internal `canMarkBuildDone` function. If this function indicates a 'RED' health state (returns `false`), it must return a `409 Conflict` status. Otherwise, it proceeds to extract `token` and `oilReceiptIds` from the request body and calls an internal `recordBuildComplete` function.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `router.post` definitions to `routes/lifeos-council-builder-routes.js`.
2.  Implementing the request body parsing and validation within these route handlers.
3.  Importing and calling the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions from an appropriate service layer (e.g., `builderControlPlaneService`).
4.  Implementing the conditional `409` response based on the `canMarkBuildDone` result.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their handler logic.
*   `services/builderControlPlaneService.js`: This file (or an equivalent existing service) will need to expose or implement the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If these functions do not exist, they will need to be created here following existing service patterns.

### 4. Verifier/Runtime Checks

**Unit Tests (for `routes/lifeos-council-builder-routes.js` handlers and `builderControlPlaneService`):**
*   **`POST /build/start`:**
    *   Verify 200 OK response with valid `task_id`, `blueprint_id`, `model_used`.
    *   Verify `recordBuildStart` is called exactly once with the correct payload.
    *   Verify 400 Bad Request for missing required body parameters.
*   **`POST /build/complete`:**
    *   Verify 200 OK response when `canMarkBuildDone` returns `true` and valid `token`, `oilReceiptIds` are provided.
    *   Verify `recordBuildComplete` is called exactly once with the correct payload when `canMarkBuildDone` is `true`.
    *   Verify 409 Conflict response when `canMarkBuildDone` returns `false`.
    *   Verify `recordBuildComplete` is *not* called when `canMarkBuildDone` returns `false`.
    *   Verify 400 Bad Request for missing required body parameters.

**Integration Tests (via API calls):**
*   Deploy the service and use `curl` or a similar tool to:
    *   Send a `POST` request to `/build/start` with