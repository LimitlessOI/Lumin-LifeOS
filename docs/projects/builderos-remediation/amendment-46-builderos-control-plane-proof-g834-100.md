Blueprint Note: Amendment 46 - BuilderOS Control Plane Proof (G834-100)

Objective: Implement BuilderOS build lifecycle endpoints in `routes/lifeos-council-builder-routes.js` for build state management and health-gated completion.

**1. Exact Missing Implementation / Proof Gap:**
The `routes/lifeos-council-builder-routes.js` file requires new `POST` endpoints to manage the BuilderOS build lifecycle. Specifically:
- A `POST /build/start` endpoint that accepts `task_id`, `blueprint_id`, and `model_used` in its body and calls an internal `recordBuildStart` function.
- A `POST /build/complete` endpoint that accepts a `token` and `OIL receipt IDs` in its body and calls an internal `recordBuildComplete` function.
- The `POST /build/complete` endpoint must check `canMarkBuildDone()` and return a `409 Conflict` status if `canMarkBuildDone()` fails (e.g., when health is RED).

**2. Smallest Safe Build Slice to Close It:**
Implement the two new `POST` routes in `routes/lifeos-council-builder-routes.js`.
- For `/build/start`, parse the request body for `task_id`, `blueprint_id`, `model_used` and pass them to `recordBuildStart`.
- For `/build/complete`, parse the request body for `token` and `OIL receipt IDs`. Before calling `recordBuildComplete`, invoke `canMarkBuildDone()`. If it returns `false`, respond with `409 Conflict`. Otherwise, proceed to call `recordBuildComplete`.
Assume `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are available as imported utility functions or methods from an existing service layer.

**3. Exact Safe-Scope Files to Touch First:**
- `routes/lifeos-council-builder-routes.js`: Add the new route definitions and their handlers.
- `services/builder-lifecycle-service.js` (or similar existing service): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are properly defined and exported, if they are not already.

**4. Verifier/Runtime Checks:**
- **`POST /build/start`:**
    - Send `POST` request to `/build/start` with `{ "task_id": "t123", "blueprint_id": "b456", "model_used": "gpt-4" }`.
    - Expected: HTTP 200 OK. Verify `recordBuildStart` was called with the correct payload (e.g., via logs or mock assertions in tests).
- **`POST /build/complete` (Success Path):**
    - Ensure `canMarkBuildDone()` is configured to return `true`.
    - Send `POST` request to `/build/complete` with `{ "token": "abc", "oil_receipt_ids": ["r1", "r2"] }`.
    - Expected: HTTP 200 OK. Verify `recordBuildComplete` was called with the correct payload.
- **`POST /build/complete` (Failure Path - Health RED):**
    - Ensure `canMarkBuildDone()` is configured to return `false` (simulating health RED).
    - Send `POST` request to `/build/complete` with `{ "token": "abc", "oil_receipt_ids": ["r1", "r2"] }`.
    - Expected: HTTP 409 Conflict. Verify `recordBuildComplete` was *not* called.

**5. Stop Conditions if Runtime Truth Disagrees:**
- If `POST /build/start` does not return 200 OK or `recordBuildStart` is not invoked.
- If `POST /build/complete` (success path) does not return 200 OK or `recordBuildComplete` is not invoked.
- If `POST /build/complete` (failure path) does not return 409 Conflict when `canMarkBuildDone` fails.
- If any required internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are not found or throw unexpected errors.