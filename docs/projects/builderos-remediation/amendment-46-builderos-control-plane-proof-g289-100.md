# Amendment 46: BuilderOS Control Plane Proof - G289-100

## Proof-Closing Blueprint Note: Wiring `routes/lifeos-council-builder-routes.js`

This document outlines the implementation plan to wire the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as per Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints and associated logic to:
- Record the start of a build process (`/build/start`).
- Record the completion of a build process (`/build/complete`).
- Enforce a health-based pre-condition (`canMarkBuildDone`) for build completion, returning a 409 conflict if the system health is RED.

The core gap is the absence of these route definitions and their integration with internal BuilderOS control plane services for state management and health checks.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `router.post` definitions to `routes/lifeos-council-builder-routes.js`: one for `/build/start` and one for `/build/complete`.
2.  Implementing or importing placeholder/stub functions for `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and `getSystemHealthStatus` (or similar health check). These functions will reside in a dedicated BuilderOS control plane service module.
3.  Integrating request body parsing for `task_id`, `blueprint_id`, `model_used`, `token`, and `oil_receipt_ids`.
4.  Adding conditional logic within the `/build/complete` handler to check `canMarkBuildDone` and return a 409 status if it fails due to RED health.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This is the primary file for route definition and integration.
-   `services/builderos-control-plane-service.js` (new or existing): This file will house the business logic for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.
-   `utils/system-health.js` (new or existing): This file will provide the `getSystemHealthStatus` function.

### 4. Verifier/Runtime Checks

To verify the implementation:

1.  **Build Start Success:**
    -   **Action:** Send a `POST` request to `/build/start` with a JSON body: `{"task_id": "test-task-1", "blueprint_id": "bp-g289-100", "model_used": "gemini-flash"}`.
    -   **Expected Outcome:** HTTP 200 OK response. Verify that `recordBuildStart` was called with the correct payload (e.g., via logs or mock assertions).

2.  **Build Complete Success (Health GREEN):**
    -   **Pre-condition:** Ensure `getSystemHealthStatus()` returns 'GREEN'.
    -   **Action:** Send a `POST` request to `/build/complete` with a JSON body: `{"token": "build-token-123", "oil_receipt_ids": ["oil-rct-001", "oil-rct-002"]}`.
    -   **Expected Outcome:** HTTP 200 OK response. Verify that `recordBuildComplete` was called with the correct payload.

3.  **Build Complete Failure (Health RED):**
    -   **Pre-condition:** Configure `getSystemHealthStatus()` to return 'RED'.
    -   **Action:** Send a `POST` request to `/build/complete` with a JSON body: `{"token": "build-token-456", "oil_receipt_ids": ["oil-rct-003"]}`.
    -   **Expected Outcome:** HTTP 409 Conflict response. Verify that `recordBuildComplete` was *not* called.

4.  **Input Validation:**
    -   **Action:** Send `POST` requests to `/build/start` and `/build/complete` with missing or malformed required parameters.
    -   **Expected Outcome:** Appropriate HTTP 400 Bad Request responses.

### 5. Stop Conditions if Runtime Truth Disagrees

The build pass should stop and require re-evaluation if any of the following occur:

-   **Route Not Found (404):** If `/build/start` or `/build/complete` routes return a 404, indicating the routes were not correctly registered.
-   **Incorrect Status Codes:** If the expected 200 OK or 409 Conflict responses are not received for the respective scenarios.
-   **Service Call Mismatch:** If `recordBuildStart` or `recordBuildComplete` are not invoked, or are invoked with incorrect data, as observed through logs or mock interactions.
-   **Health Check Bypass:** If `/build/complete` succeeds when `getSystemHealthStatus()` is 'RED', indicating `canMarkBuildDone` logic is flawed or bypassed.