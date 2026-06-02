# Amendment 46 BuilderOS Control Plane Proof - G1051-100 Remediation

This document outlines the remediation plan and proof for closing the implementation gap identified during the OIL verifier rejection for Amendment 46, specifically concerning the BuilderOS control plane wiring in `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the `/build` endpoints within `routes/lifeos-council-builder-routes.js` to correctly handle build start and completion events, including the necessary health checks for marking a build as done. The `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are not yet integrated into the route handlers as specified.

Specifically:
-   No `POST` route handler for `/build` start that calls `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   No `POST` route handler for `/build` complete that calls `recordBuildComplete` with token and OIL receipt IDs.
-   No conditional logic to return a `409 Conflict` if `canMarkBuildDone` fails when the system health is RED during build completion.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to introduce or update the `/build` POST endpoints. This includes:

1.  **Build Start Endpoint:** Implement a `POST /build/start` route.
    -   Extract `task_id`, `blueprint_id`, `model_used` from the request body.
    -   Call an internal `builderControlPlaneService.recordBuildStart({ task_id, blueprint_id, model_used })`.
    -   Return a success response (e.g., 200 OK or 201 Created).

2.  **Build Complete Endpoint:** Implement a `POST /build/complete` route.
    -   Extract `token` and `oil_receipt_ids` from the request body.
    -   Before calling `recordBuildComplete`, check `builderControlPlaneService.canMarkBuildDone()`.
    -   If `canMarkBuildDone()` returns `false` (indicating health RED or other blocking condition), return `409 Conflict`.
    -   Otherwise, call `builderControlPlaneService.recordBuildComplete({ token, oil_receipt_ids })`.
    -   Return a success response (e.g., 200 OK).

3.  **Service Layer Integration:** Ensure `builderControlPlaneService` (or equivalent) exposes `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. These functions will encapsulate the core BuilderOS logic.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new POST route definitions and their respective handlers.
-   `services/builder-control-plane.js` (or similar existing service file): This file will be created or updated to contain the implementation of `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. This adheres to the principle of not rebuilding what exists, but extending the service layer for BuilderOS-specific logic. If such a service file does not exist, it will be created following existing patterns.

## 4. Verifier/Runtime Checks

### Verifier Checks (Automated Tests)

-   **Unit/Integration Test `routes/lifeos-council-builder-routes.js`:**
    -   `POST /build/start` with valid payload: Expect 200/201, verify `recordBuildStart` was called with correct arguments.
    -   `POST /build/complete` with valid payload, `canMarkBuildDone` returns `true`: Expect 200, verify `recordBuildComplete` was called.
    -   `POST /build/complete` with valid payload, `canMarkBuildDone` returns `false`: Expect 409, verify `recordBuildComplete` was *not* called.
    -   Edge cases for invalid payloads (e.g., missing `task_id`, `token`).

-   **Unit Test `services/builder-control-plane.js`:**
    -   `recordBuildStart`: Verify internal state updates or database writes.
    -   `recordBuildComplete`: Verify internal state updates, token validation, and OIL receipt processing.
    -   `canMarkBuildDone`: Test scenarios where health is GREEN/YELLOW (expect `true`) and RED (expect `false`).

### Runtime Checks (Observability)

-   **Logs:** Monitor application logs for successful invocations of `recordBuildStart` and `recordBuildComplete`. Look for error logs related to build processing or health checks.
-   **Metrics:** Observe HTTP status codes for `/build/start` and `/build/complete` endpoints. Track the frequency of 409 responses from `/build/complete`.
-   **BuilderOS State:** Verify that the BuilderOS internal state machine correctly transitions builds from "started" to "completed" and that OIL receipts are correctly associated.
-   **Health Dashboard:** Confirm that the system health status (GREEN/YELLOW/RED) correctly influences the `canMarkBuildDone` outcome.

## 5. Stop Conditions if Runtime Truth Disagrees

-   **Incorrect Build State Transitions:** If builds are not correctly marked as "started" or "completed" in BuilderOS after successful API calls.
-   **Unexpected 409 Responses:** If `POST /build/complete` returns 409 when the system health is GREEN, or if it returns 200 when health is RED.
-   **Missing Data:** If `task_id`, `blueprint_id`, `model_used`, `token`, or `oil_receipt_ids` are not correctly persisted or processed.
-   **Performance Degradation:** If the addition of these routes or service calls introduces unacceptable latency or resource consumption on the control plane.
-   **Verifier Rejection (New):** If a subsequent verifier pass identifies new syntax errors, logical flaws, or security vulnerabilities introduced by this change.