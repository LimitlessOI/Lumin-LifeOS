# Amendment 46: BuilderOS Control Plane Proof - G57-100

## Proof-Closing Blueprint Note

This note addresses the implementation gap for wiring the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified by Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of two critical POST endpoints in `routes/lifeos-council-builder-routes.js`:
-   `/build/start`: To initiate a build record with `task_id`, `blueprint_id`, and `model_used`.
-   `/build/complete`: To finalize a build record with a `token` and `OIL receipt IDs`, incorporating a health-based pre-condition check (`canMarkBuildDone`).

These endpoints require corresponding controller functions to handle the business logic, including data persistence (mocked for proof) and the health check.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Creating or extending `controllers/builder-council-controller.js` to include `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.
2.  Adding two new POST routes to `routes/lifeos-council-builder-routes.js` that import and utilize these controller functions.
3.  Implementing basic request body validation for required parameters.
4.  Integrating the `canMarkBuildDone` check into the `/build/complete` route, returning a 409 status code if the check fails.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`
-   `controllers/builder-council-controller.js` (create if not exists, otherwise extend)

### 4. Verifier/Runtime Checks

**Test Case 1: Successful Build Start**
-   **Action:** `POST /build/start` with `{ "task_id": "T123", "blueprint_id": "BP456", "model_used": "g57-100" }`
-   **Expected Outcome:** HTTP 202 Accepted. Log/DB entry indicating build start for T123.

**Test Case 2: Successful Build Complete (Health Green)**
-   **Pre-condition:** Ensure `canMarkBuildDone()` returns `true` (simulated healthy state).
-   **Action:** `POST /build/complete` with `{ "token": "BUILD_TOKEN_XYZ", "oil_receipt_ids": ["OIL-001", "OIL-002"] }`
-   **Expected Outcome:** HTTP 202 Accepted. Log/DB entry indicating build complete