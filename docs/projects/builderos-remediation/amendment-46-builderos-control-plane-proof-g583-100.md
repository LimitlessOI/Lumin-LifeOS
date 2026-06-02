# Amendment 46: BuilderOS Control Plane Proof - G583-100

## Proof-Closing Blueprint Note

This document outlines the implementation plan and verification steps to close the proof gap identified in Amendment 46, specifically regarding the wiring of the BuilderOS control plane routes for build start and completion.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a BuilderOS build process. Specifically, the following functionalities are missing:

*   A `POST /build/start` endpoint to initiate a build record, capturing `task_id`, `blueprint_id`, and `model_used`.
*   A `POST /build/complete` endpoint to finalize a build record, requiring a build token and OIL receipt IDs.
*   The necessary health check integration (`canMarkBuildDone`) within the `/build/complete` flow to prevent completion when the system health is in a RED state, returning a 409 Conflict.
*   The underlying service layer functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) that encapsulate the business logic for these operations.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:

1.  **Route Definition:** Adding two new `POST` routes (`/build/start` and `/build/complete`) to `routes/lifeos-council-builder-routes.js`.
2.  **Service Layer Integration:** Implementing or integrating placeholder functions for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` within `services/builder-control-plane-service.js` (or a similar dedicated builder service). These functions will handle the persistence of build state and health checks.
3.  **Request Body Parsing:** Ensuring the routes correctly parse the incoming JSON payloads for required parameters.
4.  **Error Handling:** Implementing the 409 Conflict response for the `/build/complete` endpoint when `canMarkBuildDone` returns `false`.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: To define the new API endpoints and their handlers.
*   `services/builder-control-plane-service.js`: To implement the core logic for build state management and health checks. This file is assumed to exist or will be created as a dedicated service for BuilderOS control plane operations.
*   `utils/health-check.js` (if applicable): If `canMarkBuildDone` relies on a centralized health status utility, this file might need to expose or provide an interface for the builder service to query system health.

### 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   Verify `recordBuildStart` correctly processes input and initiates a build record.
    *   Verify `recordBuildComplete` correctly processes input, updates the build record, and handles token/receipt IDs.
    *   Verify `canMarkBuildDone` returns `true` when health is GREEN/YELLOW and `false` when health is RED.
*   **Integration Tests:**
    *   `POST /build/start` with valid `task_id`, `blueprint_id`, `model_used`: Expect HTTP 200 OK and a new build record in the database.
    *   `POST /build/complete` with valid `token` and `oil_receipt_ids` (when health is GREEN/YELLOW): Expect HTTP 200 OK and the build record marked as complete.
    *   `POST /build/complete` with valid `token` and `oil_receipt_ids` (when health is RED): Expect HTTP 409 Conflict and the build record remaining incomplete.
    *   Test edge cases: missing parameters, invalid tokens, non-existent build IDs.
*   **Manual Verification:**
    *   Use a tool like Postman or `curl` to send requests to the `/build/start` and `/build/complete` endpoints.
    *   Observe the HTTP responses