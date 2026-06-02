# Amendment 46 BuilderOS Control Plane Proof - G999-100

## Proof-Closing Blueprint Note

This note outlines the implementation plan for wiring BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file requires new POST endpoints and associated logic to manage BuilderOS build lifecycle events:
-   `POST /build/start`: To record build initiation, accepting `task_id`, `blueprint_id`, and `model_used`. This will call an internal `recordBuildStart` function.
-   `POST /build/complete`: To record build completion, accepting a `token` and `OIL receipt IDs`. This will call an internal `recordBuildComplete` function.
-   A pre-completion check using `canMarkBuildDone`. If this function fails (e.g., system health is RED), the `/build/complete` endpoint must return a `409 Conflict` status.

These additions are crucial for BuilderOS to accurately track build states and ensure operational integrity.

### 2. Smallest Safe Build Slice to Close It

The minimal build slice involves:
1.  Adding two new POST routes (`/build/start`, `/build/complete`) to `routes/lifeos-council-builder-routes.js`.
2.  Implementing stubbed versions of `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` within a dedicated BuilderOS service file (e.g., `services/builder-control-plane-service.js`).
3.  Adding basic request body validation for required parameters.
4.  Implementing the conditional `409` response logic based on the `canMarkBuildDone` function's return value.

This slice focuses on routing and immediate service layer interaction, deferring complex persistence or health logic to subsequent passes.

### 3. Exact Safe-Scope Files