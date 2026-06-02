Blueprint Note: Amendment 46 BuilderOS Control Plane Proof (G814-100)
This note addresses the implementation gap for wiring BuilderOS control plane routes in `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

1.  **Exact Missing Implementation or Proof Gap**
    The primary gap is the absence of `POST /build/start` and `POST /build/complete` route definitions within `routes/lifeos-council-builder-routes.js`. These routes are required to trigger the internal `recordBuildStart` and `recordBuildComplete` functions, respectively. Additionally, the conditional 409 response based on `canMarkBuildDone` when health is RED is not implemented for the build completion flow.

2.  **Smallest Safe Build Slice to Close It**
    The smallest safe build slice involves adding two new POST routes to `routes/lifeos-council-builder-routes.js`.
    -   A `POST /build/start` route that extracts `task_id`, `blueprint_id`, and `model_used` from the request body and calls `recordBuildStart`.
    -   A `POST /build/complete` route that extracts `token` and `OIL receipt IDs` from the request body. Before calling `recordBuildComplete`, it must check `canMarkBuildDone`. If `canMarkBuildDone` returns false (indicating RED health or other blocking conditions), it should respond with a 409 status. Otherwise, it proceeds to call `recordBuildComplete`.

3.  **Exact Safe-Scope Files to Touch First**
    -   `routes/lifeos-council-builder-routes.js`: This is the primary file for adding the new route definitions and their associated logic.
    -   `services/builder-control-plane.js` (or similar internal service): This file is assumed to export `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. Verification of their existence and expected signatures is required, but no modification to their internal logic is part of this slice unless they are entirely missing.

4.  **Verifier/Runtime Checks**
    -   **Route Accessibility:**
        -   `curl -X POST -H "Content-Type: application/json" -d '{"task_id": "t123", "blueprint_id": "b456", "model_used": "g814"}' http://localhost:PORT/build/start` should return 200 OK and log `recordBuildStart` invocation with correct parameters.
        -   `curl -X POST -H "Content-Type: application/json" -d '{"token": "abc", "receipt_ids": ["r1", "r2"]}' http://localhost:PORT/build/complete` should return 200 OK and log `recordBuildComplete` invocation with correct parameters under normal health.
    -   **Error Condition (409):**
        -   Simulate a RED health state or force `canMarkBuildDone` to return `false`.
        -   `curl -X POST -H "Content-Type: application/json" -d '{"token": "abc", "receipt_ids": ["r1", "r2"]}' http://localhost:PORT/build/complete` should return 409 Conflict.
    -   **Payload Validation:** Ensure that missing or malformed parameters in the request body result in appropriate error responses (e.g., 400 Bad Request) before internal service calls.
    -   **Internal State Transition:** Monitor logs or internal metrics to confirm `recordBuildStart` and `recordBuildComplete` are correctly updating the BuilderOS build state.

5.  **Stop Conditions if Runtime Truth Disagrees**
    -   If `POST /build/start` or `POST /build/complete` routes return 404 Not Found.
    -   If `recordBuildStart` or `recordBuildComplete` are not invoked with the expected parameters upon successful route calls.
    -   If the 409 Conflict response is not returned when `canMarkBuildDone` indicates a blocking condition (e.g., health RED).
    -   If the internal BuilderOS state (as observed through logs or monitoring) does not transition correctly after successful route calls.
    -   If the verifier reports new syntax errors or unexpected behavior related to the modified `routes/lifeos-council-builder-routes.js` file.