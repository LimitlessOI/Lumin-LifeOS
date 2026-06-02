Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane Wiring (G869-100)

This note details the required implementation to wire the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as per Amendment 46, ensuring proper build lifecycle management and health-based control.

1. Exact Missing Implementation or Proof Gap
The primary gap is the absence of the specified `POST /build/start` and `POST /build/complete` endpoints within `routes/lifeos-council-builder-routes.js`. This includes the integration with `recordBuildStart`, `recordBuildComplete`, and the conditional `canMarkBuildDone` health check.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
-   Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
-   Implementing the `/build/start` handler to parse `task_id`, `blueprint_id`, and `model_used` from the request body and call `recordBuildStart`.
-   Implementing the `/build/complete` handler to parse `token` and `OIL receipt IDs` from the request body.
-   Integrating a call to `canMarkBuildDone()` within the `/build/complete` handler.
-   Returning a 409 Conflict status if `canMarkBuildDone()` returns false (indicating health RED).
-   Calling `recordBuildComplete()` if `canMarkBuildDone()` returns true.

3. Exact Safe-Scope Files to Touch First
-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes and their handlers.
-   `utils/builder-control.js` (assumed): This file is expected to contain `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If not, these utilities must be created or imported from an existing, approved module.

4. Verifier/Runtime Checks
-   **Route Accessibility:** Send `POST` requests to `/build/start` and `/build/complete` to confirm they are reachable and respond.
-   **`recordBuildStart` Invocation:**
    -   Send `POST /build/start` with `{ task_id: 'T123', blueprint_id: 'B456', model_used: 'M789' }`.
    -   Verify internal logs or metrics confirm `recordBuildStart` was called with the correct parameters.
    -   Expected response: 200 OK (or 204 No Content).
-   **`recordBuildComplete` Invocation (Success Path):**
    -   Mock `canMarkBuildDone()` to return `true`.
    -   Send `POST /build/complete` with `{ token: 'abc', oil_receipt_ids: ['R1', 'R2'] }`.
    -   Verify internal logs or metrics confirm `recordBuildComplete` was called with the correct parameters.
    -   Expected response: 200 OK (or 204 No Content).
-   **`canMarkBuildDone` Failure Path (Health RED):**
    -   Mock `canMarkBuildDone()` to return `false`.
    -   Send `POST /build/complete` with `{ token: 'def', oil_receipt_ids: ['R3'] }`.
    -   Verify the API returns a `409 Conflict` status code.
    -   Verify `recordBuildComplete` was *not* called.

5. Stop Conditions if Runtime Truth Disagrees
-   If `POST /build/start` or `POST /build/complete` routes are not found (404) or return unexpected server errors (5xx).
-   If `recordBuildStart` or `recordBuildComplete` are not invoked as expected, or are invoked with incorrect parameters.
-   If the `409 Conflict` response is not returned when `canMarkBuildDone()` indicates health RED.
-   If `recordBuildComplete` is called when `canMarkBuildDone()` indicates health RED.
-   If the system's health state (as determined by `canMarkBuildDone`) does not correctly influence the `/build/complete` endpoint's behavior.