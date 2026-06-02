# Amendment 46: BuilderOS Control Plane Proof - G243-100

## Blueprint Note: Builder Control Plane Route Wiring

This note addresses the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified by Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary `POST` endpoints for `/build/start` and `/build/complete`. Specifically, it needs:
*   A `POST /build/start` route to initiate a build record, calling an internal `recordBuildStart` function with `task_id`, `blueprint_id`, and `model_used`.
*   A `POST /build/complete` route to finalize a build record, calling an internal `recordBuildComplete` function with a `token` and `OIL receipt IDs`. This route must also incorporate a health check: if `canMarkBuildDone` fails when the system health is RED, it must return a `409 Conflict` status.

The underlying `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are assumed to exist within the `builder-control-plane-service.js` module, requiring proper import and invocation.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new `router.post` definitions to `routes/lifeos-council-builder-routes.js`. Each route handler will:
*   Parse the request body for the required parameters.
*   Call the appropriate service function (`recordBuildStart` or `recordBuildComplete`).
*   For `/build/complete`, execute the `canMarkBuildDone` check and conditionally return 409.
*   Handle success (e.g., 200 OK, 202 Accepted) and potential errors (e.g., 400 Bad Request for missing params, 500 Internal Server Error).

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: This is the primary file for modification.
*   `../services/builder-control-plane-service.js`: (Assumed existing) This file would contain the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. No modification to this file is expected for this slice, only import.

### 4. Verifier/Runtime Checks

To verify the implementation:
*   **`POST /build/start`:**
    *   Send a `POST` request to `/build/start` with a JSON body containing `task_id`, `blueprint_id`, and `model_used`.
    *   Expect a `200 OK` or `202 Accepted` response.
    *   Verify through internal logging or monitoring that `recordBuildStart` was invoked with the correct parameters.
    *   Send a request with missing parameters and expect a `400 Bad Request`.
*   **`POST /build/complete`:**
    *   Send a `POST` request to `/build/complete` with a JSON body containing `token` and `oil_receipt_ids` (an array).
    *   Expect a `200 OK` or `202 Accepted` response when health is not RED or `canMarkBuildDone` succeeds.
    *   Verify through internal logging or monitoring that `recordBuildComplete` was invoked with the correct parameters.
    *   **Health RED / `canMarkBuildDone` failure:** Simulate a RED health state (if possible via a test harness or direct service mock) such that `canMarkBuildDone` returns `false`. Send the `POST /build/complete` request.
    *   Expect a `409 Conflict` response in this specific scenario.
    *   Send a request with missing parameters and expect a `400 Bad Request`.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `POST /build/start` or `POST /build/complete` endpoints are unreachable or consistently return `500 Internal Server Error` for valid requests.
*   If `recordBuildStart` or `recordBuildComplete` are not demonstrably invoked or fail internally despite successful route handling.
*   If the `409 Conflict` response is not returned for `POST /build/complete` when `canMarkBuildDone` fails under RED health conditions, or if it's returned incorrectly when health is GREEN/YELLOW.
*   If the routes accept requests with missing mandatory parameters without returning `400 Bad Request`.

---