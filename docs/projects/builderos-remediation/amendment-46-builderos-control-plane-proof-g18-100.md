# Amendment 46: BuilderOS Control Plane Proof - G18-100 Remediation Note

This document outlines the remediation plan for the BuilderOS control plane, specifically addressing the integration of build start and completion signals within `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` module lacks the necessary POST endpoints and associated logic to:
-   Record the start of a build process, including `task_id`, `blueprint_id`, and `model_used`.
-   Record the completion of a build process, requiring a token and OIL receipt IDs.
-   Enforce a health-based pre-condition for marking a build as complete, returning a 409 Conflict status if `canMarkBuildDone` fails (e.g., when system health is RED).

Specifically, the `lifeos-council-builder-routes.js` file needs:
-   A `POST /build/start` endpoint that calls an internal `recordBuildStart` function.
-   A `POST /build/complete` endpoint that calls an internal `recordBuildComplete` function, preceded by a check using `canMarkBuildDone`.

## 2. Smallest Safe Build Slice to Close It

Implement the two new POST routes (`/build/start` and `/build/complete`) within `routes/lifeos-council-builder-routes.js`.
Introduce or extend a `builderService` or `builderController` to encapsulate the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` logic. This ensures separation of concerns and reusability.

## 3. Exact Safe-Scope Files to Touch First

1.  `routes/lifeos-council-builder-routes.js`: Add the new POST route definitions and their handlers.
2.  `services/builder-service.js` (or similar existing service/controller): Implement/extend `recordBuildStart({ task_id, blueprint_id, model_used })`, `recordBuildComplete({ token, oilReceiptIds })`, and `canMarkBuildDone()`. If `services/builder-service.js` does not exist, create it following existing service patterns.

## 4. Verifier/Runtime Checks

-   **Unit Tests:**
    -   Verify `recordBuildStart` correctly processes and persists build start data.
    -   Verify `recordBuildComplete` correctly processes and persists build completion data, including OIL receipt IDs.
    -   Verify `canMarkBuildDone` returns `true` under healthy conditions and `false` under RED health conditions.
-   **Integration Tests:**
    -   Send `POST /build/start` requests with valid and invalid payloads; assert correct responses (e.g., 200 OK, 400 Bad Request) and data persistence.
    -   Send `POST /build/complete` requests with valid payloads; assert 200 OK and data persistence.
    -   Send `POST /build/complete` requests when `canMarkBuildDone` is configured to fail (e.g., simulate RED health); assert 409 Conflict response.
-   **Manual Verification:**
    -   Use `curl` or Postman to hit `POST /build/start` and `POST /build/complete` endpoints.
    -   Monitor logs and database for correct recording of build events.
    -   Manually toggle system health (if possible via dev tools/env vars) to test the 409 condition for `/build/complete`.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., 500 Internal Server Error).
-   If build start or completion records are not correctly persisted in the database or associated storage.
-   If the `POST /build/complete` endpoint does not return a 409 Conflict when `canMarkBuildDone` indicates a failure condition (e.g., RED health).
-   If the data (`task_id`, `blueprint_id`, `model_used`, `token`, `oilReceiptIds`) is not correctly extracted or stored.
-   If the implementation introduces regressions in existing `lifeos-council-builder-routes.js` functionality.