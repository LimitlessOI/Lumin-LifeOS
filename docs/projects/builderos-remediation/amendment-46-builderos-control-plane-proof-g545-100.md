# Amendment 46: BuilderOS Control Plane Proof - G545-100

This document serves as a proof-closing blueprint note for `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, detailing the implementation plan for wiring the BuilderOS control plane routes.

## 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` module currently lacks the necessary POST endpoints to manage the lifecycle of a BuilderOS build process. Specifically, two new routes are required:
1.  A `/build/start` endpoint to initiate a build record, accepting `task_id`, `blueprint_id`, and `model_used`.
2.  A `/build/complete` endpoint to finalize a build record, accepting a `token` and `OIL receipt IDs`. This endpoint must also incorporate a pre-condition check using `canMarkBuildDone` and return a `409 Conflict` status if this check fails specifically when the system health is `RED`.

These routes will integrate with existing or newly defined internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) responsible for the core logic.

## 2. Smallest Safe Build Slice to Close It

The minimal implementation involves adding two new `router.post` handlers within `routes/lifeos-council-builder-routes.js`. These handlers will:

*   **`/build/start`**:
    *   Extract `task_id`, `blueprint_id`, and `model_used` from `req.body`.
    *   Call an internal `recordBuildStart` function with these parameters.
    *   Respond with a success status (e.g., 200 OK) or an appropriate error.
*   **`/build/complete`**:
    *   Extract `token` and `oilReceiptIds` from `req.body`.
    *   Call an internal `canMarkBuildDone` function.
    *   If `canMarkBuildDone` indicates failure and specifically a `healthStatus` of `RED`, respond with `409 Conflict`.
    *   Otherwise, call an internal `recordBuildComplete` function with the `