Amendment 46: BuilderOS Control Plane Proof - G1011-100

Proof-Closing Blueprint Note for AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md

This document addresses the signal requiring follow-through for Amendment 46, specifically the wiring of `routes/lifeos-council-builder-routes.js` to manage BuilderOS-only governed loop execution.

### 1. Exact Missing Implementation or Proof Gap

The gap is the absence of POST endpoints in `routes/lifeos-council-builder-routes.js` for:
*   `/build/start`: To record build initiation with `task_id`, `blueprint_id`, `model_used`.
*   `/build/complete`: To record build finalization with `token`, `OIL receipt IDs`, and enforce `canMarkBuildDone` health check.

### 2. Smallest Safe Build Slice to Close It

1.  **Add POST routes to `routes/lifeos-council-builder-routes.js`:**
    *   `/build/start` handler: Extract `task_id`, `blueprint_id`, `model_used`. Call `recordBuildStart()`. Respond 200.
    *   `/build/complete` handler: Extract `token`, `oil_receipt_ids`. Call `canMarkBuildDone()`. If false (health RED), respond 409. Else, call `recordBuildComplete()`. Respond 200.
2.  **Ensure `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` are available:** Import from `