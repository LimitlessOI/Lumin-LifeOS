### Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane Wiring (G816-100)

**1. Exact Missing Implementation / Proof Gap:**
The `routes/lifeos-council-builder-routes.js` requires new POST endpoints to integrate with the BuilderOS control plane for build lifecycle management. Specifically:
*   A `POST /build/start` endpoint to internally call `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used` extracted from the request body.
*   A `POST /build/complete` endpoint to internally call `recordBuildComplete` with a build token and an array of OIL receipt IDs, also from the request body.
*   The `POST /build/complete` endpoint must include a pre-check using `canMarkBuildDone`. If `canMarkBuildDone` returns `false` (indicating, for example, a RED health state), the endpoint must respond with a `409 Conflict` status code.

**2. Smallest Safe Build Slice to Close It:**
Implement two new POST route handlers within `routes/lifeos-council-builder-routes.js`. These handlers will:
*   Validate incoming request bodies for required parameters (`task_id`, `blueprint_id`, `model_used` for `/start`; `token`, `oil_receipt_ids` for `/complete`).
*   Import and invoke the corresponding internal BuilderOS service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`).
*   Handle successful invocations by returning a `200 OK` response.
*   Implement error handling, specifically the `409 Conflict` for `canMarkBuildDone` failure, and `400 Bad Request` for invalid input.

**3. Exact Safe-Scope Files to Touch First:**
*   `routes/lifeos-council-builder-routes.js` (for adding the new route definitions and handlers)
*   `services/builder-control-plane-service.js` (assumed location for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions; if this file does not exist, it would be the next file to create/extend to house these internal service operations).

**4. Verifier/Runtime Checks:**
*   **Unit Tests:**
    *   Verify `POST /build/start` successfully calls `recordBuildStart` with the correct payload and returns `200`.
    *   Verify `POST /build/complete` successfully calls `recordBuildComplete` with the correct payload and returns `200`.
    *   Verify `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` returns `false`.
    *