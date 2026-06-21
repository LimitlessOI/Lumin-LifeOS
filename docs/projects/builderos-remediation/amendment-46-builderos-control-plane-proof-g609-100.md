<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof - G609-100 Remediation Note -->

# Amendment 46 BuilderOS Control Plane Proof - G609-100 Remediation Note

This document outlines the remediation plan and proof for the BuilderOS control plane changes, specifically addressing the wiring of build lifecycle events within `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete implementation and verification of the `/build` lifecycle endpoints within `routes/lifeos-council-builder-routes.js`. Specifically:
-   **`POST /build/start`**: Requires implementation to internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   **`POST /build/complete`**: Requires implementation to internally call `recordBuildComplete` with a build token and OIL receipt IDs.
-   **Health Check Integration**: The `/build/complete` endpoint must integrate `canMarkBuildDone` and return a `409 Conflict` status if `canMarkBuildDone` fails (e.g., when BuilderOS health is RED).

The previous attempt to populate `docs/projects/builderos-remediation/amendment-46-builderos-control-plane-proof-g609-100.md` with JavaScript code led to the `ERR_UNKNOWN_FILE_EXTENSION` verifier rejection. The proof gap is that the *documentation* of the implementation was malformed, and the *implementation itself* is still pending.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  **Refactoring the existing JavaScript snippet** (which was incorrectly placed in this `.md` file) into its correct location: `routes/lifeos-council-builder-routes.js`.
2.  **Completing the implementation** of the `POST /build/start` and `POST /build/complete` routes in `routes/lifeos-council-builder-routes.js`.
3.  **Adding error handling** for the `canMarkBuildDone` check on `/build/complete`.

This slice focuses solely on the BuilderOS control plane, avoiding any modifications to LifeOS user features or TSOS customer-facing surfaces, adhering to the specification.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will receive the new route definitions and logic.
-   `services/builderService.js`: (Assumed to exist and export `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, `BUILDER_HEALTH_STATUS`). This file should be reviewed to ensure the exported functions are correctly defined and accessible. No direct modification to this file is expected in this slice, but its existence and contract are critical.

## 4. Verifier/Runtime Checks

To verify the implementation:
-   **Unit/Integration Tests for `routes/lifeos-council-builder-routes.js`**:
    -   Verify `POST /build/start` successfully invokes `builderService.recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
    -   Verify `POST /build/complete` successfully invokes `builderService.recordBuildComplete` with the provided token and OIL receipt IDs when `canMarkBuildDone` returns true.
    -   Verify `POST /build/complete` returns a `409 Conflict` status code when `builderService.canMarkBuildDone` returns false (simulating RED health).
    -   Verify `POST /build/complete` returns a `200 OK` or `204 No Content` status