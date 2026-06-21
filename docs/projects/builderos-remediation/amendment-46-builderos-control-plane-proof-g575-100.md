<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G575 100. -->

Amendment 46: BuilderOS Control Plane Proof - G575-100
Proof-Closing Blueprint Note: Builder Control Plane Wiring

This document outlines the necessary steps to wire the BuilderOS control plane within `routes/lifeos-council-builder-routes.js` as per Amendment 46, focusing on build start and completion signals.

1.  **Exact Missing Implementation or Proof Gap:**
    The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints and associated logic to:
    *   Record the start of a build process via an internal `recordBuildStart` function, accepting `task_id`, `blueprint_id`, and `model_used`.
    *   Record the completion of a build process via an internal `recordBuildComplete` function, accepting a token and OIL receipt IDs.
    *   Implement a conditional check using `canMarkBuildDone` (which considers system health) before marking a build complete, returning a 409 Conflict status if this check fails when health is RED.

2.  **Smallest Safe Build Slice to Close It:**
    Implement two new POST routes within `routes/lifeos-council-builder-routes.js`:
    *   `/build/start`: To handle build initiation.
    *   `/build/complete`: To handle build completion, including the `canMarkBuildDone` check.
    This slice focuses solely on the route definitions and their immediate handler logic, leveraging existing internal service functions.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js` (primary modification target)
    *   `services/builder-control-plane-service.js` (to ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are correctly exposed and implemented, if not already)

4.  **Verifier/Runtime Checks:**
    *   **Build Start:**
        *   `POST /build/start` with `{ task_id: '...', blueprint_id: '...', model_used: '...' }` should return `202 Accepted` or `200 OK`.
        *   Verify that a corresponding build start event is logged and persisted in the BuilderOS database.
    *   **Build Complete (Success Path):**
        *   `POST /build/complete` with `{ token: '...', oil_receipt_ids: ['...', '...'] }` when `canMarkBuildDone` returns true (e.g., health is GREEN) should return `202 Accepted` or `200 OK`.
        *   Verify that a corresponding build complete event is logged and persisted, linking to the provided OIL receipt IDs.
    *   **Build Complete (Failure Path - Health RED):**
        *   Simulate a scenario where `canMarkBuildDone` returns false due to system health being RED.
        *   `POST /build/complete` with valid payload should return `409 Conflict`.
        *   Verify no build completion event is recorded in this specific failure scenario.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If any of the specified routes (`/build/start`, `/build/complete`) are not accessible or return unexpected HTTP status codes (e.g., 404, 500) during testing.
    *   If build start or complete records are not accurately persisted in the database, or if associated metadata (like `oil_receipt_ids`) is missing or incorrect.
    *   If the `409 Conflict` response is not consistently returned when `canMarkBuildDone` fails due to health RED, indicating a bypass of the control plane's safety mechanism.
    *   If the internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are not found, throw unhandled exceptions, or exhibit incorrect behavior.