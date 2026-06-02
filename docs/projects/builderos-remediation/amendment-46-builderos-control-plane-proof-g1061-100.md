# Amendment 46: BuilderOS Control Plane Proof - G1061-100

## Proof-Closing Blueprint Note: BuilderOS Control Plane Wiring

This note addresses the implementation gap for wiring the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as specified in Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints and associated logic to manage the BuilderOS build lifecycle. Specifically:
*   A `POST /build/start` endpoint to initiate a build record.
*   A `POST /build/complete` endpoint to finalize a build record.
*   Integration with a health monitoring service to enforce `canMarkBuildDone` checks, returning a 409 Conflict status if the system health is RED during build completion attempts.

### 2. Smallest Safe Build Slice to Close It

1.  **Route Definition:** Add two new `router.post` definitions to `routes/lifeos-council-builder-routes.js`.
2.  **Controller/Service Integration:** Implement or integrate existing `builderControlService.recordBuildStart`, `builderControlService.recordBuildComplete`, and `healthMonitorService.canMarkBuildDone` functions.
3.  **Error Handling:** Introduce middleware or direct logic within the `/build/complete` handler to check `healthMonitorService.canMarkBuildDone` and return `res.status(409).send()` if it fails due to RED health.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: Add the new route definitions and their handlers.
*   `services/builder-control-service.js` (or similar): Implement/expose `recordBuildStart` and `recordBuildComplete` functions.
*   `services/health-monitor-service.js` (or similar): Implement/expose `canMarkBuildDone` and a method to retrieve current system health status.

### 4. Verifier/Runtime Checks

1.  **Build Start Success:** Send `POST /build/start` to `/lifeos-council/build/start` with `{ task_id: 'test-task-1', blueprint_id: 'bp-123', model_used: 'g1061' }`. Verify a 200 OK response and that a build record is created in the database with `status: 'started'`.
2.  **Build Complete Success (Green Health):** Ensure system health is GREEN. Send `POST /build/complete` to `/lifeos-council/build/complete` with `{ token: 'build-token-xyz', oil_receipt_ids: ['oil-1', 'oil-2'] }`. Verify a 200 OK response and that the corresponding build record is updated to `status: 'completed'` with receipt IDs.
3.  **Build Complete Failure (Red Health):** Simulate system health as RED (e.g., via a health service mock or direct state manipulation). Send `POST /build/complete` to `/lifeos-council/build/complete` with valid payload. Verify a 409 Conflict response.
4.  **Payload Validation:** Test with invalid or missing payloads to ensure appropriate 400 Bad Request responses (if input validation middleware is in place).

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return 404.
*   If the database records for build start/complete are not created or updated as expected.
*   If the 409 Conflict response is not returned when `canMarkBuildDone` fails due to RED health, or if it's returned incorrectly when health is GREEN.
*   If the `task_id`, `blueprint_id`, `model_used`, `token`, or `oil_receipt_ids` are not correctly persisted or processed.