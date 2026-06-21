<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G17-100 Remediation -->

# Amendment 46: BuilderOS Control Plane Proof - G17-100 Remediation

This document outlines the remediation plan and proof-closing steps for the BuilderOS control plane, specifically addressing the integration of build start and completion signals within `routes/lifeos-council-builder-routes.js`.

## OIL Verifier Rejection Analysis

The previous verifier rejection (`ERR_UNKNOWN_FILE_EXTENSION` for `.md` file) indicates an issue with the verifier's execution environment attempting to interpret a Markdown document as an ESM module. This is an external configuration issue with the verifier itself, not a defect in the content or format of the `.md` file. The current task focuses on the *implementation* required by the amendment, assuming the verifier environment will correctly process documentation files in subsequent passes.

## Proof-Closing Blueprint Note

### 1. Exact Missing Implementation or Proof Gap

The core gap is the missing implementation of the build lifecycle hooks within `routes/lifeos-council-builder-routes.js`. Specifically:
-   A `POST /build/start` endpoint to record the initiation of a build.
-   A `POST /build/complete` endpoint to record the successful completion of a build, including OIL receipt IDs.
-   Integration of `canMarkBuildDone` health check logic to prevent build completion when the system is in a RED state.

### 2. Smallest Safe Build Slice to Close It

Implement the two new POST endpoints in `routes/lifeos-council-builder-routes.js` and their respective handler functions. These handlers will call internal BuilderOS services for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: Add new route definitions and their corresponding handler functions.
-   `services/builder-control-plane-service.js` (or similar existing builder service): Implement/extend `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.

### 4. Verifier/Runtime Checks

1.  **Build Start Verification:**
    *   Send `POST /build/start` with `task_id`, `blueprint_id`, `model_used`.
    *   Expected: HTTP 202 Accepted or 200 OK.
    *   Runtime Check: Verify `recordBuildStart` is called with correct payload. Check BuilderOS logs for successful recording.
    *   Database Check: Confirm a new build record is created in the BuilderOS database with `status: 'started'`.

2.  **Build Complete Verification (Success Path):**
    *   Send `POST /build/complete` with `token` and `oil_receipt_ids`.
    *   Pre-condition: `canMarkBuildDone` returns `true` (e.g., health is GREEN).
    *   Expected: HTTP 202 Accepted or 200 OK.
    *   Runtime Check: Verify `recordBuildComplete` is called with correct payload. Check BuilderOS logs for successful recording.
    *   Database Check: Confirm the corresponding build record is updated to `status: 'completed'` with associated OIL receipt IDs.

3.  **Build Complete Verification (Failure Path - Health RED):**
    *   Send `POST /build/complete` with `token` and `oil_receipt_ids`.
    *   Pre-condition: `canMarkBuildDone` returns `false` (e.g., health is RED).
    *   Expected: HTTP 409 Conflict.
    *   Runtime Check: Verify `canMarkBuildDone` is called and returns `false`. Verify `recordBuildComplete` is *not* called.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` does not trigger `recordBuildStart` or fails to record the build start event.
-   If `POST /build/complete` does not trigger `recordBuildComplete` on success, or fails to update the build record.
-   If `POST /build/complete` does not return 409 when `canMarkBuildDone` indicates a RED health state.
-   If the recorded build state or associated metadata (e.g., `oil_receipt_ids`) is incorrect or missing in the BuilderOS database.
-   If the verifier continues to reject the `.md` file due to `ERR_UNKNOWN_FILE_EXTENSION`, indicating an unresolved external verifier configuration issue.