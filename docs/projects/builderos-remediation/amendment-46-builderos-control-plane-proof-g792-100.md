# Amendment 46: BuilderOS Control Plane Proof - G792-100

This document serves as a proof-closing blueprint note for Amendment 46, focusing on the required wiring within `routes/lifeos-council-builder-routes.js` to support BuilderOS-only governed loop execution.

## Proof-Closing Blueprint Note

### 1. Exact missing implementation or proof gap

The primary gap is the absence of dedicated API endpoints within `routes/lifeos-council-builder-routes.js` to signal the start and completion of a build process, along with the necessary health check integration for build completion. Specifically:

*   **Missing Route 1: `POST /build/start`**
    *   **Purpose:** To record the initiation of a build task.
    *   **Expected Payload:** `{ task_id: string, blueprint_id: string, model_used: string }`
    *   **Action:** Call an internal `recordBuildStart` function with the provided payload.
*   **Missing Route 2: `POST /build/complete`**
    *   **Purpose:** To record the successful or failed completion of a build task and perform pre-completion checks.
    *   **Expected Payload:** `{ token: string, oil_receipt_ids: string[] }` (assuming `oil_receipt_ids` is an array of strings)
    *   **Action:**
        1.  Call an internal `canMarkBuildDone` function.
        2.  If `canMarkBuildDone` returns `false` (indicating health RED or other blocking conditions), return a `409 Conflict` status.
        3.  Otherwise, call an internal `recordBuildComplete` function with the provided token and OIL receipt IDs.

### 2. Smallest safe build slice to close it

The smallest safe build slice involves:
1.  Adding two new `POST` route definitions to `routes/lifeos-council-builder-routes.js`.
2.  Implementing or integrating the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. These functions should reside in a dedicated builder control plane service or utility module to maintain separation of concerns.

### 3. Exact safe-scope files to touch first

*   `routes/lifeos-council-builder-routes.js`: For defining the new `POST /build/start` and `POST /build/complete` endpoints.
*   `services/builder-control-plane.js` (or similar new file): To house the implementation of `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. This file would be imported by the route handlers.

### 4. Verifier/runtime checks

*   **Unit Tests:**
    *   Verify `POST /build/start` handler correctly calls `recordBuildStart` with the expected arguments.
    *   Verify `POST /build/complete` handler correctly calls `canMarkBuildDone` before `recordBuildComplete`.
    *   Verify `POST /build/complete` returns `409` when `canMarkBuildDone` returns `false`.
    *   Verify `POST /build/complete` returns `200/201` when `canMarkBuildDone` returns `true` and `recordBuildComplete` is called.
*   **Integration Tests:**
    *   Send a `POST` request to `/build/start` with a valid payload and assert a `200/201` response.
    *   Send a `POST` request to `/build/complete` with a valid payload (assuming `canMarkBuildDone` is mocked to return `true`) and assert a `200/201` response.
    *   Send a `POST` request to `/build/complete` with a valid payload (assuming `canMarkBuildDone` is mocked to return `false`) and assert a `409` response.
*   **Observability:**
    *   Monitor logs for successful invocation of `recordBuildStart` and `recordBuildComplete` functions.
    *   Monitor system health metrics to confirm `canMarkBuildDone` accurately reflects the system state.

### 5. Stop conditions if runtime truth disagrees

*   **Route Inaccessibility:** If `POST /build/start` or `POST /build/complete` endpoints return `404 Not Found` or `500 Internal Server Error` under expected conditions.
*   **Incorrect Function Invocation:** If `recordBuildStart` or `