<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G179 100. -->

Amendment 46: BuilderOS Control Plane Proof - G179-100
Proof-Closing Blueprint Note: BuilderOS Control Plane Wiring

This note addresses the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js` to manage BuilderOS build lifecycle events.

**1. Exact Missing Implementation or Proof Gap**
The `routes/lifeos-council-builder-routes.js` file requires new POST endpoints for `/build/start` and `/build/complete` to integrate with the BuilderOS control plane. Specifically, the implementation gap is:
*   **`/build/start` (POST):** Needs to accept `task_id`, `blueprint_id`, and `model_used` from the request body and call an internal `recordBuildStart` function.
*   **`/build/complete` (POST):** Needs to accept a `token` and `OIL receipt IDs` (e.g., `oilReceiptIds` array) from the request body and call an internal `recordBuildComplete` function.
*   **Error Handling:** The `/build/complete` endpoint must return a `409 Conflict` status if `canMarkBuildDone` fails when the system health is in a RED state.

**2. Smallest Safe Build Slice to Close It**
Implement the two new POST routes within `routes/lifeos-council-builder-routes.js`.
*   For `/build/start`, define a handler that extracts `task_id`, `blueprint_id`, `model_used` from the request body and invokes `recordBuildStart`.
*   For `/build/complete`, define a handler that extracts `token` and `oilReceiptIds` from the request body. Before calling `recordBuildComplete`, check `canMarkBuildDone`. If `canMarkBuildDone` returns false and the system health is RED, respond with 409. Otherwise, proceed to call `recordBuildComplete`.
*   Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are accessible (imported or defined) within the route handler's scope.

**3. Exact Safe-Scope Files to Touch First**
*   `routes/lifeos-council-builder-routes.js`: This is the primary file for defining the new endpoints and their logic.
*   Potentially `services/builder-lifecycle-service.js` (or similar): If `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are to be encapsulated in a dedicated service module, this file would be created or modified. For this pass, we assume these functions are either imported or stubbed within the routes file for immediate integration.

**4. Verifier/Runtime Checks**
*   **Verifier Checks:**
    *   Successful deployment of `routes/lifeos-council-builder-routes.js` without syntax errors.
    *   API contract adherence for `/build/start` and `/build/complete` endpoints (e.g., correct request body schema validation).
*   **Runtime Checks:**
    *   **`POST /build/start`:**
        *   Send a POST request to `/build/start` with `{ task_id: 't123', blueprint_id: 'b456', model_used: 'g179' }`.
        *   Expected: HTTP 200/202 OK. Verify `recordBuildStart` was called and relevant data is persisted (e.g., in a build log or database).
    *   **`POST /build/complete` (Success Path):**
        *   Ensure system health is NOT RED or `canMarkBuildDone` returns true.
        *   Send a POST request to `/build/complete` with `{ token: 'some-token', oilReceiptIds: ['oil-r1', 'oil-r2'] }`.
        *   Expected: HTTP 200/202 OK. Verify `recordBuildComplete` was called and OIL receipts are processed.
    *   **`POST /build/complete` (Failure Path - Health RED):**
        *   Force system health to RED state such that `canMarkBuildDone` returns false.
        *   Send a POST request to `/build/complete` with valid payload.
        *   Expected: HTTP 409 Conflict. Verify `recordBuildComplete` was NOT called.

**5. Stop Conditions if Runtime Truth Disagrees**
*   If `recordBuildStart` or `recordBuildComplete` calls do not execute or fail to persist data as expected.
*   If the `/build/start` or `/build/complete` endpoints return unexpected HTTP status codes (e.g., 500 for valid requests, or 200 when 409 is expected).
*   If the 409 response for `canMarkBuildDone` is not triggered under RED health conditions, or is triggered incorrectly when health is not RED.
*   If payload validation for `task_id`, `blueprint_id`, `model_used`, `token`, or `oilReceiptIds` is incorrect or missing.
*   If the routes are not accessible or respond with "Not Found".