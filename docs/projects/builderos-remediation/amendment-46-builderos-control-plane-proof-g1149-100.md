<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G1149 100. -->

Blueprint Note: Amendment 46 - BuilderOS Control Plane Proof (G1149-100)

1. Exact Missing Implementation or Proof Gap
The `routes/lifeos-council-builder-routes.js` module currently lacks the necessary apiEPs and associated logic to manage the BuilderOS build lifecycle events. Specifically:
-   There is no `POST /build/start` endpoint to initiate a build, which should internally call `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   There is no `POST /build/complete` endpoint to finalize a build, which should internally call `recordBuildComplete` with a build token and OIL receipt IDs.
-   The `POST /build/complete` endpoint does not implement the required check for `canMarkBuildDone` and return a 409 Conflict status if this check fails when the system health is RED.

2. Smallest Safe Build Slice to Close It
Implement two new POST endpoints within `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
-   `/build/start` will extract `task_id`, `blueprint_id`, and `model_used` from the request body and pass them to `builderService.recordBuildStart`.
-   `/build/complete` will extract `token` and `oil_receipt_ids` from the request body. It will then call `builderService.canMarkBuildDone`. If `canMarkBuildDone` returns false (indicating a failure condition, specifically when health is RED as per spec), it will respond with a 409 status. Otherwise, it will proceed to call `builderService.recordBuildComplete`.

3. Exact Safe-Scope Files to Touch First
-   `routes/lifeos-council-builder-routes.js` (for adding the new routes and their handlers)
-   `services/builder-service.js` (to ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are properly defined and implemented, though the prompt focuses on wiring the routes, these service functions are implied dependencies).

4. Verifier/Runtime Checks
-   **Unit/Integration Test:** Send a `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, `model_used`. Verify that `builderService.recordBuildStart` is called with the correct parameters and the response is successful (e.g., 200 OK or 201 Created).
-   **Unit/Integration Test:** Send a `POST` request to `/build/complete` with valid `token` and `oil_receipt_ids`. Verify that `builderService.recordBuildComplete` is called with the correct parameters and the response is successful.
-   **Unit/Integration Test (Failure Case):** Mock `builderService.canMarkBuildDone` to return `false` (simulating health RED failure). Send a `POST` request to `/build/complete`. Verify that the response status is 409 Conflict and `builderService.recordBuildComplete` is NOT called.
-   **End-to-End Test:** Observe BuilderOS logs or database entries to confirm build start and completion events are correctly recorded after successful API calls.

5. Stop Conditions if Runtime Truth Disagrees
-   If `POST /build/start` or `POST /build/complete` endpoints return unexpected status codes (e.g., 500 Internal Server Error) for valid requests.
-   If build start/completion records are not accurately persisted or retrievable via BuilderOS internal tools.
-   If the 409 Conflict response is not consistently returned when `canMarkBuildDone` fails under health RED conditions.
-   If any existing BuilderOS control plane functionality or LifeOS user features are inadvertently impacted or broken by these changes.