<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G1057 100. -->

AMENDMENT 46: BuilderOS Control Plane Proof - G1057-100

This document closes the proof gap identified in `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md` regarding the wiring of build lifecycle events within `routes/lifeos-council-builder-routes.js`.

**1. Exact Missing Implementation or Proof Gap**
The `routes/lifeos-council-builder-routes.js` file lacks the necessary route definitions and handlers to manage the BuilderOS build lifecycle events. Specifically:
*   A `POST /build/start` endpoint is missing to trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
*   A `POST /build/complete` endpoint is missing to trigger `recordBuildComplete` with `token` and `OIL receipt IDs`.
*   The `POST /build/complete` handler does not include the conditional check for `canMarkBuildDone` when the system health is RED, which should result in a 409 Conflict response.

**2. Smallest Safe Build Slice to Close It**
Implement the two new POST routes (`/build/start` and `/build/complete`) within `routes/lifeos-council-builder-routes.js`.
*   For `/build/start`, extract `task_id`, `blueprint_id`, and `model_used` from the request body and call `recordBuildStart`.
*   For `/build/complete`, extract `token` and `oil_receipt_ids` from the request body. Before calling `recordBuildComplete`, check the system health. If health is RED and `canMarkBuildDone()` returns false, respond with a 409 status. Otherwise, proceed with `recordBuildComplete`.
*   Assume `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and a `getSystemHealth` function (returning 'RED' or 'GREEN') are available from a `builderService` or similar module.

**3. Exact Safe-Scope Files to Touch First**
*   `routes/lifeos-council-builder-routes.js`: Add the new route definitions and their corresponding handler logic.
*   `services/builder-service.js` (or similar existing service): Ensure `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and `getSystemHealth` functions are defined and accessible. If they don't exist, create stub implementations for the initial build pass.

**4. Verifier/Runtime Checks**
*   **Unit Tests (e.g., `test/routes/lifeos-council-builder-routes.test.js`):**
    *   Verify `POST /build/start` with valid payload calls `builderService.recordBuildStart` once with the correct arguments and returns 200/204.
    *   Verify `POST /build/complete` with valid payload (and `canMarkBuildDone` true, health not RED) calls `builderService.recordBuildComplete` once with the correct arguments and returns 200/204.
    *   Verify `POST /build/complete` returns 409 when `builderService.getSystemHealth()` is 'RED' and `builderService.canMarkBuildDone()` returns `false`.
    *   Verify `POST /build/complete` returns 200/204 when `builderService.getSystemHealth()` is 'GREEN' (regardless of `canMarkBuildDone`).
    *   Verify `POST /build/complete` returns 200/204 when `builderService.getSystemHealth()` is 'RED' but `builderService.canMarkBuildDone()` returns `true`.
*   **Integration Tests (e.g., via `curl` or automated E2E tests):**
    *   Send `POST` requests to `/build/start` and `/build/complete` with various valid and invalid payloads.
    *   Monitor application logs to confirm `recordBuildStart` and `recordBuildComplete` are invoked.
    *   Manually or programmatically set system health to 'RED' and test the `/build/complete` endpoint to confirm 409 responses under the specified conditions.

**5. Stop Conditions if Runtime Truth Disagrees**
*   If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., 404, 500) for valid requests.
*   If `builderService.recordBuildStart` or `builderService.recordBuildComplete` are not called, or are called with incorrect parameters.
*   If the 409 Conflict response is not consistently returned when system health is 'RED' and `canMarkBuildDone` fails.
*   If the system health check (`getSystemHealth`) or `canMarkBuildDone` logic is inaccessible or behaves unexpectedly, preventing the correct conditional logic from executing.
*   If the parsing of `task_id`, `blueprint_id`, `model_used`, `token`, or `OIL receipt IDs` from the request body fails.