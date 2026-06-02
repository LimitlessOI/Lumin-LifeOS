Amendment 46: BuilderOS Control Plane Proof - G547-100

Blueprint Note: Wiring `routes/lifeos-council-builder-routes.js`

This document serves as a proof-closing note for the implementation of BuilderOS control plane wiring as specified in `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`. It addresses the signal requiring follow-through for `routes/lifeos-council-builder-routes.js`.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of dedicated `POST` endpoints within `routes/lifeos-council-builder-routes.js` to handle the `build start` and `build complete` lifecycle events. Specifically:

*   A `POST /build/start` endpoint to receive `task_id`, `blueprint_id`, and `model_used`, and call an internal `recordBuildStart` function.
*   A `POST /build/complete` endpoint to receive a build token and OIL receipt IDs, and call an internal `recordBuildComplete` function.
*   Logic within the `build complete` flow to check `canMarkBuildDone` and return a `409 Conflict` if it fails when the system health is RED.

### 2. Smallest Safe Build Slice to Close It

Implement the two `POST` routes in `routes/lifeos-council-builder-routes.js`.

*   **For `/build/start`:**
    *   Define a `POST` route at `/build/start`.
    *   Extract `task_id`, `blueprint_id`, `model_used` from the request body.
    *   Call `await builderService.recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   Respond with `200 OK`.
*   **For `/build/complete`:**
    *   Define a `POST` route at `/build/complete`.
    *   Extract `token` and `oil_receipt_ids` from the request body.
    *   Before calling `recordBuildComplete`, check `const canProceed = await builderService.canMarkBuildDone();` and `const isHealthRed = await healthService.isSystemHealthRed();`.
    *   If `!canProceed && isHealthRed`, respond with `409 Conflict`.
    *   Otherwise, call `await builderService.recordBuildComplete({ token, oil_receipt_ids })`.
    *   Respond with `200 OK`.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js` (primary modification for route definitions and handler logic).
*   `services/builderService.js` (ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are correctly implemented and exported).
*   `services/healthService.js` (ensure `isSystemHealthRed` is correctly implemented and exported).

### 4. Verifier/Runtime Checks

*   **API Test 1 (Build Start Success):**
    *   `POST /build/start` with `{ "task_id": "t123", "blueprint_id": "b456", "model_used": "gpt-4" }`.
    *   Expected: `200 OK`.
    *   Verification: Confirm `recordBuildStart` was invoked (e.g., via logs, mock assertion, or database entry for build start).
*   **API Test 2 (Build Complete Success):**
    *   Ensure system health is not RED or `canMarkBuildDone` returns `true`.
    *   `POST /build/complete` with `{ "token": "build_token_xyz", "oil_receipt_ids": ["oil_r1", "oil_r2"] }`.
    *   Expected: `200 OK`.
    *   Verification: Confirm `recordBuildComplete` was invoked (e.g., via logs, mock assertion, or database entry for build completion).
*   **API Test 3 (Build Complete Conflict):**
    *   Configure system state such that `builderService.canMarkBuildDone()` returns `false` AND `healthService.isSystemHealthRed()` returns `true`.
    *   `POST /build/complete` with `{ "token": "build_token_abc", "oil_receipt_ids": ["oil_r3"] }`.
    *   Expected: `409 Conflict`.
    *   Verification: Confirm `recordBuildComplete` was *not* invoked.

### 5. Stop Conditions if Runtime Truth Disagrees

*   `POST /build/start` does not return `200 OK` for valid input.
*   `recordBuildStart` side effects (e.g., database record creation) are not observed after a successful `/build/start` call.
*   `POST /build/complete` does not return `200 OK` for valid input when `canMarkBuildDone` is true or health is not RED.
*   `recordBuildComplete` side effects are not observed after a successful `/build/complete` call.
*   `POST /build/complete` does not return `409 Conflict` when `canMarkBuildDone` is false and health is RED.
*   Any unhandled exceptions or server crashes related to these new routes.