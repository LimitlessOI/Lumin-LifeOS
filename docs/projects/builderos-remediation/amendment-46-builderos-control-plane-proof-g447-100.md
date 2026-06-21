<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G447 100. -->

Amendment 46: BuilderOS Control Plane Proof - G447-100
This document serves as a proof-closing blueprint note for the BuilderOS Control Plane, specifically addressing the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js`.

1.  **Exact Missing Implementation or Proof Gap**
    The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints and associated handler logic for managing build start and completion signals. Specifically, the implementation gap includes:
    *   A `POST /build` route to trigger `recordBuildStart({ task_id, blueprint_id, model_used })`.
    *   A `POST /build/complete` route to trigger `recordBuildComplete({ token, oilReceiptIds })`.
    *   Conditional logic within the `POST /build/complete` handler to check `canMarkBuildDone()` and return a 409 status if this check fails (e.g., when system health is RED).

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves adding the two specified POST route definitions and their respective handler functions directly within `routes/lifeos-council-builder-routes.js`. These handlers will import and invoke the necessary functions from an assumed `builderControlPlaneService` module.

3.  **Exact Safe-Scope Files to Touch First**
    *   `routes/lifeos-council-builder-routes.js` (primary modification for route definitions and handlers)
    *   `services/builder-control-plane-service.js` (if `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` require implementation or exposure, though for this wiring proof, their existence is assumed).

4.  **Verifier/Runtime Checks**
    *   **`POST /build` (Start):**
        *   **Action:** Send `POST /build` with a JSON body: `{ "task_id": "test-task-1", "blueprint_id": "test-bp-1", "model_used": "g4" }`.
        *   **Expected Outcome:** HTTP 200 or 202 status. Verify that `builderControlPlaneService.recordBuildStart` was invoked with the exact `task_id`, `blueprint_id`, and `model_used` provided.
    *   **`POST /build/complete` (Success Path):**
        *   **Precondition:** Ensure `builderControlPlaneService.canMarkBuildDone()` would return `true`.
        *   **Action:** Send `POST /build/complete` with a JSON body: `{ "token": "valid-build-token", "oilReceiptIds": ["receipt-1", "receipt-2"] }`.
        *   **Expected Outcome:** HTTP 200 or 202 status. Verify that `builderControlPlaneService.recordBuildComplete` was invoked with the exact `token` and `oilReceiptIds` provided.
    *   **`POST /build/complete` (Health RED Path):**
        *   **Precondition:** Configure the system or mock `builderControlPlaneService.canMarkBuildDone()` to return `false` (simulating health RED).
        *   **Action:** Send `POST /build/complete` with a JSON body: `{ "token": "any-token", "oilReceiptIds": ["any-receipt"] }`.
        *   **Expected Outcome:** HTTP 409 status. Verify that `builderControlPlaneService.recordBuildComplete` was *not* invoked.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   If `POST /build` does not return 200/202 or fails to correctly invoke `recordBuildStart` with the expected parameters.
    *   If `POST /build/complete` (success path) does not return 200/202 or fails to correctly invoke `recordBuildComplete` with the expected parameters.
    *   If `POST /build/complete` (health RED path) returns any status other than 409.
    *   If `POST /build/complete` (health RED path) incorrectly proceeds to invoke `recordBuildComplete`.
    *   If any route returns a 5xx error for valid requests.