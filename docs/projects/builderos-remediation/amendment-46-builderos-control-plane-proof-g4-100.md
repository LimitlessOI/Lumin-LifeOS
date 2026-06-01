# Amendment 46: BuilderOS Control Plane Proof - G4-100 Remediation

## Proof-Closing Blueprint Note

This document addresses the OIL verifier rejection and outlines the necessary steps to close the implementation gap for Amendment 46, focusing on the BuilderOS control plane. The previous verifier rejection was identified as a tooling configuration issue (attempting to execute a markdown file as JavaScript), not a defect in the proposed blueprint or its content.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of the specified route implementations within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle events (`/build` start and complete) and enforce health-based completion constraints. Specifically:
-   `POST /build/start` endpoint to trigger `recordBuildStart`.
-   `POST /build/complete` endpoint to trigger `recordBuildComplete` and enforce `canMarkBuildDone` health checks.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`.
2.  Implementing the handlers for these routes to:
    *   Call an internal `recordBuildStart` function with `task_id`, `blueprint_id`, and `model_used` on `/build/start`.
    *   Call an internal `recordBuildComplete` function with `token` and `OIL receipt IDs` on `/build/complete`.
    *   Before calling `recordBuildComplete`, invoke an internal `canMarkBuildDone` function. If `canMarkBuildDone` returns `false` (indicating health RED or other blocking condition), return a `409 Conflict` status.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their corresponding handler logic.
-   `services/builder-control-plane.js` (or similar existing service module): This module is the likely candidate for housing `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If these functions do not exist, they will be added here. If they exist, their interfaces will be confirmed and used.

### 4. Verifier/Runtime Checks

To ensure correct implementation and prevent regressions:

*   **Unit/Integration Tests:**
    *   Verify `POST /build/start` successfully calls `recordBuildStart` with correct parameters and returns a 200/202 status.
    *   Verify `POST /build/complete` successfully calls `recordBuildComplete` with correct parameters and returns a 200/202 status when `canMarkBuildDone` permits.
    *   Verify `POST /build/complete` returns a 409 status when `canMarkBuildDone` fails (e.g., health is RED), and `recordBuildComplete` is *not* invoked.
    *   Verify input validation for all required parameters (`task_id`, `blueprint_id`, `model_used`, `token`, `receipt_ids`).
*   **End-to-End (E2E) Tests:**
    *   Simulate a complete BuilderOS build flow, including calling `/build/start` and `/build/complete`, and verify the expected state transitions and data persistence.
    *   Test scenarios where health is degraded, ensuring `/build/complete` correctly rejects the request with a 409.
*   **OIL Verifier Re-run:** After deployment, re-run the OIL verifier to confirm no new syntax or structural issues are introduced by the code changes. The verifier's tooling configuration must be corrected to avoid attempting to execute markdown files.

### 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be halted and re-evaluated if any of the following conditions are observed during testing or runtime:
*   `recordBuildStart` or `recordBuildComplete` are not invoked as expected by their respective routes.
*   The `/build/complete` endpoint incorrectly allows completion (returns 200/202) when `canMarkBuildDone` indicates a failure condition (e.g., health RED).
*   The `/build/complete` endpoint incorrectly rejects completion (returns 409) when `canMarkBuildDone` indicates success.
*   Any new regressions are introduced into existing BuilderOS or LifeOS functionalities.
*   The OIL verifier reports new code-level errors (syntax, type, etc.) after its tooling configuration is corrected.
*   Performance degradation is observed in the BuilderOS control plane due to the new routes or their underlying logic.