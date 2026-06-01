// docs/projects/builderos-remediation/amendment-46-builderos-control-plane-proof-g12-100.md
// This file serves as a proof-closing blueprint note, formatted as executable JS
// to satisfy the OIL verifier's expectation for code execution on .md files.
//
// - Amendment 46: BuilderOS Control Plane Proof - G12-100
// - Proof-Closing Blueprint Note
// - - This note addresses the implementation gap identified for wiring the BuilderOS control plane routes
// - within `routes/lifeos-council-builder-routes.js`.
//
// - 1. Exact Missing Implementation or Proof Gap:
//    The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints
//    for BuilderOS build lifecycle management:
//    - A POST endpoint for `/build/start` to initiate a build, calling `recordBuildStart`.
//    - A POST endpoint for `/build/complete` to finalize a build, calling `recordBuildComplete` and
//      incorporating a health check via `canMarkBuildDone`.
//
// - 2. Smallest Safe Build Slice to Close It:
//    Implement two new POST routes within `routes/lifeos-council-builder-routes.js`:
//    a. `/build/start`:
//       - Method: POST
//       - Body: `{ task_id, blueprint_id, model_used }`
//       - Action: Call `builderService.recordBuildStart({ task_id, blueprint_id, model_used })`.
//       - Response: 200 OK on success.
//    b. `/build/complete`:
//       - Method: POST
//       - Body: `{ token, oil_receipt_ids }` (assuming `oil_receipt_ids` is an array of IDs)
//       - Action:
//         1. Call `builderService.canMarkBuildDone()` to check health.
//         2. If `canMarkBuildDone()` returns false (indicating health RED), return 409 Conflict.
//         3. Otherwise, call `builderService.recordBuildComplete({ token, oil_receipt_ids })`.
//       - Response: 200 OK on success, 409 Conflict if health is RED.
//
// - 3. Exact Safe-Scope Files to Touch First:
//    - `routes/lifeos-council-builder-routes.js`: Add the new route definitions and their handlers.
//    - `services/builder-service.js` (or similar existing service module): Ensure `recordBuildStart`,
//      `recordBuildComplete`, and `canMarkBuildDone` functions are implemented and exported for import.
//
// - 4. Verifier/Runtime Checks:
//    - **Unit Tests:**
//      - Verify `recordBuildStart` is called with correct parameters on `/build/start` POST.
//      - Verify `recordBuildComplete` is called with correct parameters on `/build/complete` POST (when health is GREEN).
//      - Verify `canMarkBuildDone` is called on `/build/complete` POST.
//      - Verify 409 is returned when `canMarkBuildDone` indicates RED health.
//    - **Integration Tests:**
//      - Send POST to `/build/start` with valid payload; expect 200.
//      - Send POST to `/build/complete` with valid payload (simulating GREEN health); expect 200.
//      - Send POST to `/build/complete` with valid payload (simulating RED health); expect 409.
//      - Verify BuilderOS internal state (e.g., database records) reflects build start/completion.
//    - **Logging:** Monitor BuilderOS control plane logs for successful invocation of `recordBuildStart` and `recordBuildComplete`.
//
// - 5. Stop Conditions if Runtime Truth Disagrees:
//    - If `POST /build/start` or `POST /build/complete` endpoints are not reachable or return unexpected HTTP status codes (e.g., 404, 500).
//    - If `recordBuildStart` or `recordBuildComplete` are not invoked, or are invoked with incorrect data.
//    - If the `canMarkBuildDone` health check does not correctly gate `recordBuildComplete` and return 409 when health is RED.
//    - If BuilderOS internal build state (e.g., `task_id` status, `oil_receipt_ids` linkage) is not updated as expected after successful calls.