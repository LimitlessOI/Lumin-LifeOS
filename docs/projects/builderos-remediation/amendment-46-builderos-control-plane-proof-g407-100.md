Amendment 46 BuilderOS Control Plane Proof - G407-100

This document provides a proof-closing blueprint note for the implementation of BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js`, as specified by Amendment 46.

**1. Exact Missing Implementation or Proof Gap**
The `routes/lifeos-council-builder-routes.js` file requires the following new endpoint wiring:
-   A `POST` endpoint at `/build/start` that accepts `task_id`, `blueprint_id`, and `model_used` in its body and calls an internal `recordBuildStart` function.
-   A `POST` endpoint at `/build/complete` that accepts a `token` and `oil_receipt_ids` in its body and calls an internal `recordBuildComplete` function.
-   The `/build/complete` endpoint must check `canMarkBuildDone` and return a `409 Conflict` status if `canMarkBuildDone` fails (e.g., when BuilderOS health is RED).

**2. Smallest Safe Build Slice to Close It**
Implement the new POST routes and their respective handlers within `routes/lifeos-council-builder-routes.js`.
Integrate calls to `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions, assuming they are exposed by a BuilderOS control plane service or controller.
The `canMarkBuildDone` check should precede the `recordBuildComplete` call for the `/build/complete` endpoint.

**3. Exact Safe-Scope Files to Touch First**
-   `routes/lifeos-council-builder-routes.js`: Add new POST route definitions and their handler logic.
-   `services/builder-control-plane-service.js` (or similar): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are implemented and exported.

**4. Verifier/Runtime Checks**
-   **Endpoint Accessibility:**
    -   `POST /build/start` with `{ "task_id": "...", "blueprint_id": "...", "model_used": "..." }` should return `200 OK` or `202 Accepted`.
    -   `POST /build/complete` with `{ "token": "...", "oil_receipt_ids": ["...", "..."] }` should return `200 OK` or `202 Accepted` under normal conditions.
-   **Function Invocation:**
    -   Verify that `recordBuildStart` is called with the correct parameters upon `/build/start` request.
    -   Verify that `recordBuildComplete` is called with the correct parameters upon `/build/complete` request (when `canMarkBuildDone` passes).
-   **Error Handling:**
    -   Simulate a scenario where `canMarkBuildDone` returns `false` (e.g., by setting BuilderOS health to RED). A `POST /build/complete` request should then return `409 Conflict`.
-   **Logging:** Monitor application logs for successful execution of `recordBuildStart` and `recordBuildComplete`, and for any errors related to `canMarkBuildDone` failures.

**5. Stop Conditions if Runtime Truth Disagrees**
-   If the new `/build/start` or `/build/complete` routes are not reachable or return unexpected HTTP status codes (e.g., 404, 500) under normal operating conditions.
-   If `recordBuildStart` or `recordBuildComplete` functions are not invoked or fail internally when their respective endpoints are hit.
-   If the `/build/complete` endpoint does not return `409 Conflict` when `canMarkBuildDone` explicitly indicates a failure condition (e.g., BuilderOS health is RED).
-   If the parameters passed to `recordBuildStart` or `recordBuildComplete` do not match the expected schema.
-   If the BuilderOS health status cannot be reliably queried or manipulated for testing the `canMarkBuildDone` logic.