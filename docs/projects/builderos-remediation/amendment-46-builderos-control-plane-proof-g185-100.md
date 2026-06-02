# Amendment 46: BuilderOS Control Plane Proof - G185-100

This document outlines the proof-closing blueprint note for wiring the BuilderOS control plane routes as per Amendment 46.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of two critical POST endpoints within `routes/lifeos-council-builder-routes.js` to manage the build lifecycle:
1.  A `/build/start` endpoint to initiate a build record.
2.  A `/build/complete` endpoint to finalize a build record and handle completion logic, including health checks.

Specifically, the implementation needs to:
*   Define a `POST /build/start` route that accepts `task_id`, `blueprint_id`, and `model_used` in its request body and calls an internal `recordBuildStart` function.
*   Define a `POST /build/complete` route that accepts a `token` and `oil_receipt_ids` (presumably from the request body) and calls an internal `recordBuildComplete` function.
*   Before calling `recordBuildComplete`, integrate a check using `canMarkBuildDone`. If `canMarkBuildDone` indicates a failure (e.g., due to system health being RED), the endpoint must return a `409 Conflict` status.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `router.post` definitions to `routes/lifeos-council-builder-routes.js`.
2.  Implementing the request body parsing for `task_id`, `blueprint_id`, `model_used`, `token`, and `oil_receipt_ids`.
3.  Importing or ensuring access to `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.
4.  Implementing the conditional `409` response based on the `canMarkBuildDone` result.

This slice focuses solely on the routing and immediate function calls, deferring the internal logic of `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` to their respective modules, assuming they are either stubs or fully implemented elsewhere.

## 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: This is the primary file for modification.
*   Potentially, a new or existing service/controller file where `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are defined, if they are not yet implemented. For this build pass, we assume these functions are callable and focus on the wiring.

## 4. Verifier/Runtime Checks

To verify the implementation:

**Test Case 1: Build Start Success**
*   **Method:** `POST`
*   **URL:** `/build/start`
*   **Body:** `{ "task_id": "g185-100", "blueprint_id": "AMENDMENT_46_BUILDEROS_CONTROL_PLANE", "model_used": "gemini-flash" }`
*   **Expected Outcome:** `200 OK` (or `201 Created` if `recordBuildStart` returns a resource), and `recordBuildStart` is invoked with the correct parameters.

**Test Case 2: Build Complete Success (Health GREEN)**
*   **Precondition:** Assume `canMarkBuildDone()` returns `true` (system health is not RED).
*   **Method:** `POST`
*   **URL:** `/build/complete`
*   **Body:** `{ "token": "some-build-token", "oil_receipt_ids": ["receipt-1", "receipt-2"] }`
*   **Expected Outcome:** `200 OK`, and `recordBuildComplete` is invoked with the correct parameters.

**Test Case 3: Build Complete Failure (Health RED)**
*   **Precondition