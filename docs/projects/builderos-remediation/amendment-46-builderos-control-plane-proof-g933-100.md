# Amendment 46 BuilderOS Control Plane Proof - G933-100

This document outlines the proof-closing blueprint note for wiring the BuilderOS control plane routes in `routes/lifeos-council-builder-routes.js`, as per Amendment 46.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated POST endpoints within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a BuilderOS build process. Specifically, routes are needed for:
*   Initiating a build (`/build/start`) and recording its commencement.
*   Completing a build (`/build/complete`) and recording its conclusion, including handling health-based pre-conditions for completion.

The `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are assumed to exist within an internal `builderService` or similar module, which needs to be integrated into these new route handlers.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `router.post` definitions to `routes/lifeos-council-builder-routes.js`.
2.  Implementing request handlers for these routes that:
    *   For `/build/start`: Extract `task_id`, `blueprint_id`, `model_used` from the request body and call `builderService.recordBuildStart()`.
    *   For `/build/complete`: Extract `token` and `oil_receipt_ids` from the request body. Before calling `builderService.recordBuildComplete()`, check `builderService.canMarkBuildDone()`. If `canMarkBuildDone()` returns `false` and the system health is `RED`, return a `409 Conflict` status. Otherwise, proceed to call `builderService.recordBuildComplete()`.
3.  Ensuring `builderService` (or equivalent) is imported and accessible within the route file.

## 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js` (Primary modification target)
*   `services/builderService.js` (Verification of `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` existence and interface, no modification unless these are missing)

## 4. Verifier/Runtime Checks

To verify the implementation:
*   **Positive Test - Build Start:**
    *   `POST /build/start` with `{ "task_id": "t123", "blueprint_id": "b456", "model_used": "gpt-4" }`.
    *   Expected: `200 OK` or `204 No Content`. Verify `recordBuildStart` is logged/executed with correct parameters.
*   **Positive Test - Build Complete:**
    *   Ensure system health is not `RED` or `canMarkBuildDone` returns `true`.
    *   `POST /build/complete` with `{ "token": "some_token", "oil_receipt_ids": ["oil1", "oil2"] }`.
    *   Expected: `200 OK` or `204 No Content`. Verify `recordBuildComplete` is logged/executed with correct parameters.
*   **Negative Test - Build Complete (Health RED, canMarkBuildDone fails):**
    *   Simulate system health `RED` and configure `builderService.canMarkBuildDone()` to return `false`.
    *   `POST /build/complete` with valid token/receipt IDs.
    *   Expected: `409 Conflict`.
*   **Schema Validation:**
    *   `POST /build/start` with missing required fields (e.g., no `task_id`).
    *   Expected: `400 Bad Request`.
    *   `POST /build/complete` with missing required fields (e.g., no `token`).
    *   Expected: `400 Bad Request`.
*   **Isolation Check:**
    *   Verify no changes or side effects on LifeOS user features or TSOS customer-facing surfaces.

## 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be stopped if any of the following conditions are met:
*   The new `/build/start` or `/build/complete` routes are not accessible or return unexpected HTTP status codes (e.g., `404 Not Found` for valid routes).
*   `recordBuildStart` or `recordBuildComplete` are not invoked or fail internally when expected.
*   The `409 Conflict` response is not returned when `canMarkBuildDone` fails and health is `RED` for `/build/complete`.
*   The `409 Conflict` response *is