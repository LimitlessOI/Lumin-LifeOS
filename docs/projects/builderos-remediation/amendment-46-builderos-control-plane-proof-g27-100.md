Amendment 46: BuilderOS Control Plane Proof - G27-100
Proof-Closing Blueprint Note

This note addresses the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46. The goal is to establish internal POST endpoints for build start and completion, including health-based conditional completion.

**1. Exact Missing Implementation or Proof Gap:**
The primary gap is the absence of the `/build` start and complete POST routes within `routes/lifeos-council-builder-routes.js`. This includes:
-   A `POST /build/start` endpoint to internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   A `POST /build/complete` endpoint to internally call `recordBuildComplete` with a build token and OIL receipt IDs.
-   Conditional logic within the `/build/complete` handler to check `canMarkBuildDone()` and return a 409 Conflict status if it fails (indicating RED health).

**2. Smallest Safe Build Slice to Close It:**
The smallest safe build slice involves adding the necessary route definitions and their corresponding handler logic directly into `routes/lifeos-council-builder-routes.js`. This will involve:
-   Importing `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` from their respective internal service modules.
-   Defining two new `router.post` handlers for `/build/start` and `/build/complete`.
-   Implementing request body parsing for `task_id`, `blueprint_id`, `model_used` for `/build/start`.
-   Implementing request body parsing for the build token and OIL receipt IDs for `/build/complete`.
-   Adding the `canMarkBuildDone` check before calling `recordBuildComplete` and handling the 409 response.

**3. Exact Safe-Scope Files to Touch First:**
-   `routes/lifeos-council-builder-routes.js` (primary modification target).
-   (Implicit) Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are correctly exported from their respective service modules (e.g., `services/build-control-service.js`, `utils/health-check.js`). No changes to these files are expected in this slice, only their consumption.

**4. Verifier/Runtime Checks:**
**Verifier Checks (Static Analysis):**
-   Confirm `routes/lifeos-council-builder-routes.js` exports a router instance.
-   Verify `router.post('/build/start', ...)` and `router.post('/build/complete', ...)` are defined.
-   Check for correct import statements for `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`.
-   Ensure `recordBuildStart` is called with `task_id`, `blueprint_id`, `model_used` from the request body.
-   Ensure `recordBuildComplete` is called with the token and OIL receipt IDs from the request body.
-   Verify the `if (!canMarkBuildDone())` condition leads to a `res.status(409).send(...)`.

**Runtime Checks (Integration/E2E):**
-   **Test 1 (Build Start Success):** Send `POST /build/start` with valid `task_id`, `blueprint_id`, `model_used`. Expect 200 OK and verification that `recordBuildStart` was invoked with correct parameters (e.g., via mock or log inspection).
-   **Test 2 (Build Complete Success):** Ensure `canMarkBuildDone()` returns true. Send `POST /build/complete` with valid token and OIL receipt IDs. Expect 200 OK and verification that `recordBuildComplete` was invoked.
-   **Test 3 (Build Complete Health RED):** Mock `canMarkBuildDone()` to return false. Send `POST /build/complete`. Expect 409 Conflict status.
-   **Test 4 (Scope Adherence):** Verify no changes or side effects on LifeOS user features or TSOS customer-facing surfaces.

**5. Stop Conditions if Runtime Truth Disagrees:**
-   If `POST /build/start` does not successfully invoke `recordBuildStart` or returns an unexpected status code.
-   If `POST /build/complete` does not successfully invoke `recordBuildComplete` when `canMarkBuildDone()` is true.
-   If `POST /build/complete` does not return 409 Conflict when `canMarkBuildDone()` is false.
-   If any new routes or modifications are detected outside of `routes/lifeos-council-builder-routes.js` that impact LifeOS user features or TSOS surfaces.
-   If the application fails to start or exhibits new errors after the changes.