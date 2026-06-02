# Amendment 46 BuilderOS Control Plane Proof - G175-100 Remediation

This document outlines the remediation plan to address the OIL verifier rejection related to the BuilderOS control plane, specifically focusing on the required wiring in `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of explicit route definitions and associated logic within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a BuilderOS build process. Specifically:
-   A `POST` endpoint for `/build/start` to internally invoke `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
-   A `POST` endpoint for `/build/complete` to internally invoke `recordBuildComplete` with a build token and OIL receipt IDs.
-   Conditional logic within the `/build/complete` endpoint to check `canMarkBuildDone` and return a `409 Conflict` status if this check fails (e.g., when BuilderOS health is RED).

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to introduce the two new `POST` routes and their respective handlers. This includes:
-   Importing necessary internal BuilderOS service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`).
-   Defining the `/build/start` route handler to extract parameters from the request body and call `recordBuildStart`.
-   Defining the `/build/complete` route handler to extract parameters, perform the `canMarkBuildDone` check, and call `recordBuildComplete` or return `409` accordingly.
This slice is self-contained within the BuilderOS control plane and does not impact LifeOS user features or TSOS customer-facing surfaces.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes and their handlers.
-   `services/builder-control-plane-service.js` (inferred): This file is the likely location for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If these functions do not exist, they would be added here. For this remediation, we assume they exist and are imported.

## 4. Verifier/Runtime Checks

### Verifier Checks
-   **Static Analysis:** Ensure `routes/lifeos-council-builder-routes.js` compiles without syntax errors and adheres to existing code patterns. Verify correct import paths for internal BuilderOS services.
-   **Dependency Check:** Confirm that `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are correctly imported and accessible within the route handlers.

### Runtime Checks
-   **`POST /build/start` Success:**
    -   Send a `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, `model_used`.
    -   Expected: HTTP `200 OK` or `202 Accepted`.
    -   Verification: Check BuilderOS internal logs for successful invocation of `recordBuildStart` with the provided payload.
-   **`POST /build/complete` Success:**
    -   Ensure BuilderOS health is GREEN (allowing `canMarkBuildDone` to pass).
    -   Send a `POST` request to `/build/complete` with a valid `token` and `OIL receipt IDs`.
    -   Expected: HTTP `200 OK` or `202 Accepted`.
    -   Verification: Check BuilderOS internal logs for successful invocation of `recordBuildComplete` with the provided payload. Verify BuilderOS state reflects build completion.
-   **`POST /build/complete` Conflict (Health RED):**
    -   Artificially set BuilderOS health to RED (causing `canMarkBuildDone` to fail).
    -   Send a `POST` request to `/build/complete` with a valid `token` and `OIL receipt IDs`.
    -   Expected: HTTP `409 Conflict`.
    -   Verification: Confirm the `409` status code is returned and `recordBuildComplete` is *not* invoked.

## 5. Stop Conditions if Runtime Truth Disagrees

-   **Route Unreachability/Incorrect Status:** If `POST /build/start` or `POST /build/complete` return `404 Not Found`, `500 Internal Server Error`, or any unexpected status code other than `200`/`202`/`409`.
-   **Function Invocation Failure:** If `recordBuildStart` or `recordBuildComplete` are not logged as invoked, or if their invocation results in internal errors (e.g., database write failures, invalid parameter handling).
-   **Incorrect `409` Trigger:** If `409 Conflict` is returned when BuilderOS health is GREEN, or if it is *not* returned when health is RED and `canMarkBuildDone` is expected to fail.
-   **BuilderOS State Mismatch:** If BuilderOS internal state (e.g., build status, audit trails) does not accurately reflect the start or completion of a build after successful route calls.
-   **Performance Degradation:** Any measurable increase in latency or resource consumption within the BuilderOS control plane after deployment of this change.

This remediation focuses on closing the identified implementation gap within the BuilderOS control plane, ensuring robust build lifecycle management and adherence to health-based operational constraints.