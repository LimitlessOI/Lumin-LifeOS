# Amendment 46: BuilderOS Control Plane Proof - G239-100 Remediation

This document outlines the remediation plan for the OIL verifier rejection related to Amendment 46, specifically addressing the incorrect file type and detailing the required implementation for the BuilderOS control plane routes.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`. The previous submission incorrectly placed JavaScript code in this Markdown file, leading to a syntax error during verification. The actual implementation for the following endpoints is missing:

*   **`POST /build/start`**: An internal endpoint to record the initiation of a build task, requiring `task_id`, `blueprint_id`, and `model_used`.
*   **`POST /build/complete`**: An internal endpoint to record the completion of a build task, requiring a `token` and `oil_receipt_ids`. This endpoint must also conditionally return a 409 status if the system health is RED and `canMarkBuildDone` indicates that the build cannot be marked as complete.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves implementing the specified POST routes in `routes/lifeos-council-builder-routes.js`. This includes:
*   Importing necessary controller functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, `getSystemHealth`).
*   Defining the `/build/start` route to call `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used` from the request body.
*   Defining the `/build/complete` route to:
    *   Extract `token` and `oil_receipt_ids` from the request body.
    *   Check system health using `getSystemHealth`.
    *   If health is RED, call `canMarkBuildDone`. If `canMarkBuildDone` returns false, respond with a 409 status.
    *   Otherwise, call `recordBuildComplete` with the extracted data.

## 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: This file will receive the primary implementation.
*   `controllers/build-controller.js`: Verify that `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and `getSystemHealth` are correctly defined and exported. (No changes expected here unless existing stubs are incomplete).

## 4. Verifier/Runtime Checks

To ensure correct implementation and behavior:

*   **Unit/Integration Tests:**
    *   Verify `POST /build/start` successfully calls `recordBuildStart` with correct payload.
    *   Verify `POST /build/complete` successfully calls `recordBuildComplete` with correct payload when conditions allow.
    *   Verify `POST /build/complete` returns `409 Conflict` when `getSystemHealth` is RED and `canMarkBuildDone` returns `false`.
    *   Verify `POST /build/complete` returns a success status (e.g., 200/204) when `getSystemHealth` is not RED, or when `getSystemHealth` is RED but `canMarkBuildDone` returns `true`.
*   **Runtime Monitoring:**
    *   Monitor application logs for successful invocations of `recordBuildStart` and `recordBuildComplete` during BuilderOS loop execution.
    *   Monitor HTTP response codes for `/build/complete` to confirm 409s are only issued under the specified RED health + `canMarkBuildDone` failure condition.
    *   Observe the BuilderOS control plane's state transitions to ensure builds are correctly started and completed.

## 5. Stop Conditions if Runtime Truth Disagrees

The implementation should be halted and re-evaluated if any of the following conditions are observed in runtime:

*   `recordBuildStart` or `recordBuildComplete` are not invoked or are invoked with incorrect parameters during BuilderOS operations.
*   `POST /build/complete` returns a 409 status when the system health is not RED, or when `canMarkBuildDone` would permit completion.
*   `POST /build/complete` fails to return a 409 status when system health is RED and `canMarkBuildDone` indicates a build cannot be marked done.
*   The BuilderOS loop exhibits unexpected behavior, hangs, or enters an inconsistent state due to these endpoints.
*   Significant latency or resource consumption spikes are observed on these routes, indicating an underlying performance issue.