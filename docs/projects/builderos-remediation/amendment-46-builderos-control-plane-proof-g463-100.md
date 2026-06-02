Amendment 46 BuilderOS Control Plane Proof - G463-100
Proof-Closing Blueprint Note
This note addresses the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js` to implement build start/complete endpoints and associated health checks.

1. Exact Missing Implementation or Proof Gap
The `routes/lifeos-council-builder-routes.js` file lacks the necessary `POST` endpoints for `/build/start` and `/build/complete`. Specifically:
    -   No route to handle `POST /build/start` and call `recordBuildStart({ task_id, blueprint_id, model_used })`.
    -   No route to handle `POST /build/complete` and call `recordBuildComplete` with a token and OIL receipt IDs.
    -   The `/build/complete` endpoint does not incorporate a check using `canMarkBuildDone` to return a 409 status when the system health is RED.

2. Smallest Safe Build Slice to Close It
Implement two new `POST` routes within `routes/lifeos-council-builder-routes.js`:
    -   A `/build/start` route that extracts `task_id`, `blueprint_id`, and `model_used` from the request body and passes them to `builderControlPlaneService.recordBuildStart()`.
    -   A `/build/complete` route that extracts `token` and `oil_receipt_ids` from the request body. Before calling `builderControlPlaneService.recordBuildComplete()`, it must check `builderControlPlaneService.canMarkBuildDone()`. If `canMarkBuildDone()` returns `false` and the system health is RED, the route should respond with a 409 Conflict status. Otherwise, it proceeds to call `recordBuildComplete()` and responds with 200 OK.

3. Exact Safe-Scope Files to Touch First
    -   `routes/lifeos-council-builder-routes.js`: Add the new route definitions and their handlers.
    -   `services/builder-control-plane.js` (or equivalent): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are correctly implemented and exposed for import. (Assumption: these functions exist in a dedicated service layer).

4. Verifier/Runtime Checks
    -   **Test 1: Build Start Success**
        -   `POST /build/start` with `{ "task_id": "t123", "blueprint_id": "b456", "model_used": "g4" }`.
        -   Expected: 200 OK. Verify `recordBuildStart` was called with the correct payload.
    -   **Test 2: Build Complete Success (Health Green)**
        -   Ensure system health is GREEN (e.g., via a mock or health endpoint).
        -   `POST /build/complete` with `{ "token": "abc", "oil_receipt_ids": ["r1", "r2"] }`.
        -   Expected: 200 OK. Verify `recordBuildComplete` was called with the correct token and receipt IDs.
    -   **Test 3: Build Complete Failure (Health Red)**
        -   Ensure system health is RED (e.g., via a mock or health endpoint).
        -   `POST /build/complete` with `{ "token": "def", "oil_receipt_ids": ["r3"] }`.
        -   Expected: 409 Conflict. Verify `canMarkBuildDone` was called and returned `false` due to RED health.
    -   **Test 4: Invalid Payload**
        -   `POST /build/start` with missing `task_id`.
        -   Expected: 400 Bad Request (or appropriate validation error).

5. Stop Conditions if Runtime Truth Disagrees
    -   If any of the `/build/start` or `/build/complete` endpoints return an unexpected HTTP status code.
    -   If internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are not invoked or are invoked with incorrect arguments.
    -   If the 409 conflict is not returned when `canMarkBuildDone` fails under RED health conditions.
    -   If the routes are not accessible or throw unhandled exceptions.
    -   Stop and re-evaluate the route handler logic in `routes/lifeos-council-builder-routes.js` and the underlying `builderControlPlaneService` implementation.