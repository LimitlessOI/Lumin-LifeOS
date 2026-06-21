<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G205-100 Remediation -->

# Amendment 46: BuilderOS Control Plane Proof - G205-100 Remediation

This document outlines the remediation plan and proof for closing the identified gaps in the BuilderOS control plane, specifically addressing the wiring of build lifecycle events within `routes/lifeos-council-builder-routes.js`. This directly responds to the OIL verifier rejection and ensures the BuilderOS governed loop execution is correctly instrumented.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of build lifecycle events within `routes/lifeos-council-builder-routes.js`. Specifically:
-   Missing `POST` endpoint for `/build/start` to internally call `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
-   Missing `POST` endpoint for `/build/complete` to internally call `recordBuildComplete` with a build token and OIL receipt IDs.
-   Missing conditional check for `canMarkBuildDone` before marking a build complete, which should return a `409 Conflict` if the health status is RED.

This gap prevents the BuilderOS control plane from accurately tracking build lifecycles and enforcing health-based completion policies, leading to the OIL verifier rejection.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to introduce the necessary route handlers and their corresponding internal service calls. This modification is isolated to the BuilderOS control plane and does not impact LifeOS user features or TSOS customer-facing surfaces.

The implementation will:
1.  Define a `POST /build/start` route.
2.  Define a `POST /build/complete` route.
3.  Import and utilize existing internal functions: `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.

## 3. Exact Safe-Scope Files to Touch First

The primary file to modify is:
-   `routes/lifeos-council-builder-routes.js`

Assuming `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are already defined in a `services` or `utils` module, no new files are required for their definition, only import statements.

## 4. Verifier/Runtime Checks

To confirm the remediation:

### API Endpoint Checks:
-   **`POST /build/start`**:
    -   **Request**: `POST /build/start` with JSON body: `{ "task_id": "T123", "blueprint_id": "BP456", "model_used": "GPT-4o" }`
    -   **Expected Response**: `200 OK` or `202 Accepted`.
    -   **Side Effect**: Verify `recordBuildStart` is invoked and a new build record is initiated in the BuilderOS internal state/database.
-   **`POST /build/complete` (Success Path)**:
    -   **Precondition**: Ensure BuilderOS health is GREEN (i.e., `canMarkBuildDone()` returns true).
    -   **Request**: `POST /build/complete` with JSON body: `{ "build_token": "BUILD_TOKEN_XYZ", "oil_receipt_ids": ["OIL-1", "OIL-2"] }`
    -   **Expected Response**: `200 OK` or `202 Accepted`.
    -   **Side Effect**: Verify `recordBuildComplete` is invoked and the build record associated with `BUILD_TOKEN_XYZ` is marked complete with the provided OIL receipt IDs.
-   **`POST /build/complete` (Health RED Path)**:
    -   **Precondition**: Force BuilderOS health to RED (i.e., `canMarkBuildDone()` returns false).
    -   **Request**: `POST /build/complete` with JSON body: `{ "build_token": "BUILD_TOKEN_ABC", "oil_receipt_ids": ["OIL-3"] }`
    -   **Expected Response**: `409 Conflict`.
    -   **Side Effect**: Verify `recordBuildComplete` is *not* invoked and the build record remains incomplete.

### Internal System Checks:
-   Monitor BuilderOS internal logs for successful invocation of `recordBuildStart` and `recordBuildComplete`.
-   Query the BuilderOS build state/database to confirm build records are created, updated, and marked complete as expected.
-   Verify that `canMarkBuildDone` is correctly consulted before `recordBuildComplete` is called.

## 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be stopped and flagged for immediate review if any of the following conditions are met:
-   **Route Inaccessibility**: The `/build/start` or `/build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., 404, 500) under normal operating conditions.
-   **Incorrect Status Codes**: The `/build/complete` endpoint does not return `409 Conflict` when `canMarkBuildDone` indicates RED health, or does not return `200/202` when health is GREEN.
-   **Function Invocation Failure**: `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` are not found, throw unhandled exceptions, or are not invoked as expected during route processing.
-   **Data Inconsistency**: Build records in the BuilderOS internal state/database are not created, updated, or marked complete correctly following successful API calls.
-   **Unintended Side Effects**: Any observed impact on LifeOS user features or TSOS customer-facing surfaces, indicating a breach of the approved builder safe scope.