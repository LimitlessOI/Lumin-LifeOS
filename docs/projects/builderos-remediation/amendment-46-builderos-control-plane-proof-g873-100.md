Amendment 46: BuilderOS Control Plane Proof - G873-100

Proof-Closing Blueprint Note: Builder Control Plane Route Wiring

This note addresses the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46. The goal is to establish endpoints for recording build start and completion, and to enforce build completion conditions based on system health.

**1. Exact Missing Implementation or Proof Gap:**
The `routes/lifeos-council-builder-routes.js` file lacks the necessary POST endpoints for `/build/start` and `/build/complete`. Specifically, the integration of `recordBuildStart({ task_id, blueprint_id, model_used })`, `recordBuildComplete({ token, oil_receipt_ids })`, and the conditional 409 response based on `canMarkBuildDone()` when health is RED, is missing.

**2. Smallest Safe Build Slice to Close It:**
Implement two new POST routes within `routes/lifeos-council-builder-routes.js`:
-   `/build/start`: Accepts `task_id`, `blueprint_id`, `model_used` in the request body and calls `recordBuildStart`.
-   `/build/complete`: Accepts `token` and `oil_receipt_ids` in the request body. Before calling `recordBuildComplete`, it must check `canMarkBuildDone()`. If `canMarkBuildDone()` returns false and the system health is RED, return a 409 Conflict status. Otherwise, proceed to call `recordBuildComplete`.

**3. Exact Safe-Scope Files to Touch First:**
-   `routes/lifeos-council-builder-routes.js`

**4. Verifier/Runtime Checks:**
-   **Test Case 1: Build Start Record**
    -   **Action:** `POST /build/start` with `{ "task_id": "t123", "blueprint_id": "b456", "model_used": "gpt-4" }`
    -   **Expected Outcome:** HTTP 200 OK. Verify `recordBuildStart` was called with the correct payload.
-   **Test Case 2: Build Complete Record (Success)**
    -   **Action:** Ensure `canMarkBuildDone()` returns true or health is not RED. `POST /build/complete` with `{ "token": "abc", "oil_receipt_ids": ["r1", "r2"] }`
    -   **Expected Outcome:** HTTP 200 OK. Verify `recordBuildComplete` was called with the correct payload.
-   **Test Case 3: Build Complete Record (Health RED, Cannot Mark Done)**
    -   **Action:** Configure system state such that `canMarkBuildDone()` returns false AND system health is RED. `POST /build/complete` with `{ "token": "def", "oil_receipt_ids": ["r3"] }`
    -   **Expected Outcome:** HTTP 409 Conflict. Verify `recordBuildComplete` was *not* called.

**5. Stop Conditions if Runtime Truth Disagrees:**
-   Any of the above verifier/runtime checks fail to produce the expected HTTP status code or internal function call behavior.
-   The `recordBuildStart` or `recordBuildComplete` functions are not invoked with the correct parameters.
-   The `canMarkBuildDone` check does not correctly gate `recordBuildComplete` based on system health, leading to incorrect 409 responses or allowing completion when it should be blocked.
-   Any unexpected side effects or regressions observed in other BuilderOS control plane operations.