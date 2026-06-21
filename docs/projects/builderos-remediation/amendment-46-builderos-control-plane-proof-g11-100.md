<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G11 100. -->

Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane (G11-100)

This note addresses the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js` to manage BuilderOS build lifecycle events.

1.  **Exact Missing Implementation or Proof Gap:**
    The `routes/lifeos-council-builder-routes.js` file requires the addition of new POST endpoints to handle the `build start` and `build complete` events. Specifically:
    -   A `POST /build/start` endpoint to trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
    -   A `POST /build/complete` endpoint to trigger `recordBuildComplete` with `token` and `OIL receipt IDs`. This endpoint must also integrate a check using `canMarkBuildDone` and return a 409 status code if the health is RED.

2.  **Smallest Safe Build Slice to Close It:**
    Implement the new POST route handlers within `routes/lifeos-council-builder-routes.js`. This involves:
    -   Defining two new routes: `POST /build/start` and `POST /build/complete`.
    -   Parsing request bodies to extract necessary parameters (`task_id`, `blueprint_id`, `model_used` for start; `token`, `oil_receipt_ids` for complete).
    -   Calling the internal `recordBuildStart` function for the `/build/start` route.
    -   Calling the internal `canMarkBuildDone` function for the `/build/complete` route. If it returns false (indicating RED health), respond with a 409 status.
    -   Calling the internal `recordBuildComplete` function for the `/build/complete` route after successful `canMarkBuildDone` check.
    -   Ensuring appropriate HTTP status codes (e.g., 200/202 for success, 409 for conflict).

3.  **Exact Safe-Scope Files to Touch First:**
    -   `routes/lifeos-council-builder-routes.js`: Add the new route definitions and their corresponding handler logic.
    -   `services/builder-control-plane.js` (or similar service layer): Verify or implement the internal functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` if they are not already fully defined and exposed for use by the router. (Assumption: these functions exist and are importable).

4.  **Verifier/Runtime Checks:**
    -   **Verifier Checks:**
        -   Send `POST` request to `/build/start` with `{ "task_id": "t1", "blueprint_id": "b1", "model_used": "m1" }`. Expect HTTP 200/202.
        -   Send `POST` request to `/build/complete` with `{ "token": "abc", "oil_receipt_ids": ["r1", "r2"] }` when `canMarkBuildDone` is configured to return true (GREEN health). Expect HTTP 200/202.
        -   Send `POST` request to `/build/complete` with `{ "token": "abc", "oil_receipt_ids": ["r1", "r2"] }` when `canMarkBuildDone` is configured to return false (RED health). Expect HTTP 409.
    -   **Runtime Checks:**
        -   Monitor application logs to confirm `recordBuildStart` is invoked with correct parameters on `/build/start` requests.
        -   Monitor application logs to confirm `recordBuildComplete` is invoked with correct parameters on successful `/build/complete` requests.
        -   Monitor application logs to confirm `canMarkBuildDone` is invoked on `/build/complete` requests.
        -   Observe HTTP response codes for `/build/complete` under varying health conditions (simulated or actual).

5.  **Stop Conditions if Runtime Truth Disagrees:**
    -   If `recordBuildStart` is not called or receives incorrect parameters upon `POST /build/start`.
    -   If `recordBuildComplete` is not called or receives incorrect parameters upon successful `POST /build/complete`.
    -   If `canMarkBuildDone` is not called upon `POST /build/complete`.
    -   If `POST /build/complete` returns a status other than 409 when `canMarkBuildDone` indicates RED health.
    -   If `POST /build/complete` returns a 409 status when `canMarkBuildDone` indicates GREEN health.
    -   If any of the new routes are not accessible or return unexpected errors.