<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof Gap G14-100 -->

# Amendment 46: BuilderOS Control Plane Proof Gap G14-100

This document outlines the proof-closing steps for integrating BuilderOS control plane signals into the LifeOS Council builder routes.

## 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` module lacks the necessary POST endpoints to capture build start and completion events, and to enforce build completion conditions based on system health. Specifically, the integration with `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` is missing.

## 2. Smallest Safe Build Slice to Close It

Implement two new POST routes within `routes/lifeos-council-builder-routes.js`:
-   `/build/start`: To trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
-   `/build/complete`: To trigger `recordBuildComplete` with `token` and `OIL receipt IDs`, and conditionally return a 409 status if `canMarkBuildDone` indicates a health RED state.

This slice focuses solely on the route definitions and their direct calls to the BuilderOS service layer functions, without implementing the internal logic of those service functions themselves.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: Add the new POST route definitions.
-   `services/builderos-control-plane-service.js` (or similar existing BuilderOS service file): Define or extend the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. (Note: The blueprint note focuses on the *route* integration, assuming these service functions will be available for import).

## 4. Verifier/Runtime Checks

1.  **Build Start Success:** Send a `POST` request to `/build/start` with a valid payload (`{ task_id: '...', blueprint_id: '...', model_used: '...' }`). Verify a `200 OK` or `202 Accepted` response and confirm that `recordBuildStart` was invoked and logged the build start event internally.
2.  **Build Complete Success:** Send a `POST` request to `/build/complete` with a valid payload (`{ token: '...', oil_receipt_ids: ['...'] }`) when `canMarkBuildDone` is expected to succeed (e.g., health is GREEN). Verify a `200 OK` or `202 Accepted` response and confirm `recordBuildComplete` was invoked and logged the build completion.
3.  **Build Complete Health Check Failure:** Send a `POST` request to `/build/complete` with a valid payload when `canMarkBuildDone` is expected to fail (e.g., health is RED). Verify a `409 Conflict` response.
4.  **Payload Validation:** Test with invalid or missing payload parameters for both routes to ensure appropriate error handling (e.g., `400 Bad Request`).

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` or `POST /build/complete` routes are not found (`404 Not Found`).
-   If successful requests to `/build/start` or `/build/complete` do not result in the expected internal service calls or state changes.
-   If `POST /build/complete` returns a status other than `409 Conflict` when `canMarkBuildDone` indicates a health RED state.
-   If `POST /build/complete` returns `409 Conflict` when `canMarkBuildDone` indicates a health GREEN state.