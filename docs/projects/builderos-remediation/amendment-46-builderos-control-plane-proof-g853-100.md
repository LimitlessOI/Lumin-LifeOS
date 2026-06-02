Amendment 46 BuilderOS Control Plane Proof - G853-100
Proof-Closing Blueprint Note
This note addresses the implementation gap for wiring the BuilderOS control plane routes in `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The primary gap is the absence of wired routes in `routes/lifeos-council-builder-routes.js` for the BuilderOS control plane. Specifically:
    *   A `POST` endpoint for `/build/start` that calls an internal `recordBuildStart` function with `task_id`, `blueprint_id`, and `model_used`.
    *   A `POST` endpoint for `/build/complete` that calls an internal `recordBuildComplete` function with a `token` and `oil_receipt_ids`.
    *   The `/build/complete` endpoint must include a check using `canMarkBuildDone` and return a `409` status code if this check fails when the system health is RED.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves adding the two specified `POST` routes to `routes/lifeos-council-builder-routes.js`, implementing their respective handler functions to call the `recordBuildStart` and `recordBuildComplete` services, and integrating the `canMarkBuildDone` health check logic for the `/build/complete` endpoint.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js`: To define and wire the new `POST /build/start` and `POST /build/complete` routes.
    *   `services/builder-control-plane-service.js` (or similar existing service layer): To implement or expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.
    *   `utils/health-check.js` (if `canMarkBuildDone` relies on a shared health utility): To ensure the health status can be queried.

4.  **Verifier/Runtime Checks**
    *   **`POST /build/start`:**
        *   Send a `POST` request to `/build/start` with a JSON body `{ "task_id": "test-task-1", "blueprint_id": "bp-123", "model_used": "gpt-4" }`.
        *   Expected outcome: HTTP 200 OK.
        *   Verify that `recordBuildStart` is invoked with the correct payload.
    *   **`POST /build/complete` (Health GREEN):**
        *   Ensure system health is GREEN (e.g., mock `canMarkBuildDone` to return `true`).
        *   Send a `POST` request to `/build/complete` with a JSON body `{ "token": "build-token-xyz", "oil_receipt_ids": ["receipt-1", "receipt-2"] }`.
        *   Expected outcome: HTTP 200 OK.
        *   Verify that `recordBuildComplete` is invoked with the correct payload.
    *   **`POST /build/complete` (Health RED):**
        *   Ensure system health is RED (e.g., mock `canMarkBuildDone` to return `false`).
        *   Send a `POST` request to `/build/complete` with a JSON body `{ "token": "build-token-xyz", "oil_receipt_ids": ["receipt-1", "receipt-2"] }`.
        *   Expected outcome: HTTP 409 Conflict.
        *   Verify that `recordBuildComplete` is *not* invoked.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   Any of the specified routes return a `404 Not Found`.
    *   The `POST /build/start` or `POST /build/complete` endpoints return unexpected HTTP status codes (e.g., 500, 400) under valid input.
    *   The `recordBuildStart` or `recordBuildComplete` service functions are not called or are called with incorrect parameters.
    *   The `canMarkBuildDone` check for `/build/complete` does not correctly gate the operation, allowing completion when health is RED and the check fails, or blocking when health is GREEN and the check passes.