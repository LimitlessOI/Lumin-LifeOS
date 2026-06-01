# Amendment 46: BuilderOS Control Plane Proof - G36-100

## Proof-Closing Blueprint Note

This document outlines the missing implementation, the smallest safe build slice, affected files, verification steps, and stop conditions for closing the proof gap related to wiring the BuilderOS control plane routes.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of two new `POST` endpoints in `routes/lifeos-council-builder-routes.js` and their corresponding internal service logic:

*   **`/build/start` (POST):** Requires an endpoint to accept `task_id`, `blueprint_id`, and `model_used` and call an internal `recordBuildStart` function.
*   **`/build/complete` (POST):** Requires an endpoint to accept a `token` and `OIL receipt IDs`, call an internal `recordBuildComplete` function, and conditionally return a `409 Conflict` if `canMarkBuildDone` fails when the system health is `RED`.

The internal functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` (including its health check dependency) are also missing or require implementation.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:

1.  **Route Definition:** Adding two new `POST` routes (`/build/start` and `/build/complete`) to `routes/lifeos-council-builder-routes.js`.
2.  **Internal Service Logic:** Creating or extending an internal service module (e.g., `services/builderControlService.js`) to house the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.
3.  **Health Check Integration:** Implementing the logic within `canMarkBuildDone` to query the system's health status and return `false` if health is `RED`.
4.  **Error Handling:** Implementing the `409` response logic in the `/build/complete` route handler based on the `canMarkBuildDone` result.

This slice avoids modifying any existing LifeOS user features or TSOS customer-facing surfaces, focusing solely on the BuilderOS control plane.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js` (for route definitions and handlers)
*   `services/builderControlService.js` (new file, or existing internal builder service, for `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` and health status integration)

### 4. Verifier/Runtime Checks

1.  **Positive `POST /build/start`:**
    *   Send a `POST` request to `/build/start` with a valid JSON body: `{ "task_id": "t-123", "blueprint_id": "b-456", "model_used": "g36-100" }`.
    *   Verify a `200 OK` or `204 No Content` response.
    *   Check internal logs to confirm `recordBuildStart` was called with the correct parameters.
2.  **Positive `POST /build/complete`:**
    *   Ensure system health is `GREEN` (or not `RED`).
    *   Send a `POST` request to `/build/complete` with a valid JSON body: `{ "token": "some-build-token", "oil_receipt_ids": ["oil-789", "oil-101"] }`.
    *   Verify a `200 OK` or `