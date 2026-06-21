<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G189-100 -->

# Amendment 46: BuilderOS Control Plane Proof - G189-100

## Proof-Closing Blueprint Note: Builder Control Plane Route Wiring

This document outlines the necessary steps to close the proof gap identified in Amendment 46, specifically regarding the wiring of build lifecycle endpoints within the BuilderOS control plane. The focus is on `routes/lifeos-council-builder-routes.js` to enable robust build start and completion signaling, including health-based pre-conditions for completion.

### 1. Exact Missing Implementation or Proof Gap

The current implementation lacks dedicated `POST` endpoints within `routes/lifeos-council-builder-routes.js` to:
- Signal the start of a build process, capturing essential metadata.
- Signal the successful completion of a build process, including build artifacts/receipts.
- Enforce a critical health check (`canMarkBuildDone`) before allowing a build to be marked complete, returning a `409 Conflict` if the system health is `RED`.

This gap prevents the BuilderOS control plane from accurately tracking build states and enforcing operational readiness for build finalization.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new `POST` routes to `routes/lifeos-council-builder-routes.js` and integrating existing or new internal service functions for build state management and health checks.

**Endpoint 1: Build Start**
- **Method**: `POST`
- **Path**: `/build/start` (or `/build` with a specific action payload, but `/build/start` is clearer for distinct actions)
- **Payload**: `{ task_id: string, blueprint_id: string, model_used: string }`
- **Action**: Call `recordBuildStart({ task_id, blueprint_id, model_used })`

**Endpoint 2: Build Complete**
- **Method**: `POST`
- **Path**: `/build/complete` (or `/build` with a specific action payload)
- **Payload**: `{ token: string, oil_receipt_ids: string[] }`
- **Pre-condition**: Call `canMarkBuildDone()`
    - If `canMarkBuildDone()` returns `false` (indicating health `RED`), return `409 Conflict`.
    - Otherwise, call `recordBuildComplete({ token, oil_receipt_ids })`

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their respective handlers.
-   `services/builder-control-plane.js` (or similar existing service layer): This file would contain or expose the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If these do not exist, they must be created here, ensuring they adhere to existing service patterns.

### 4. Verifier/Runtime Checks

1.  **Unit Tests**:
    *   Verify that `POST /build/start` correctly calls `recordBuildStart` with the provided payload.
    *   Verify that `POST /build/complete` calls `canMarkBuildDone` before `recordBuildComplete`.
    *   Verify that `POST /build/complete` returns `409` when `canMarkBuildDone` indicates health `RED`.
    *   Verify that `POST /build/complete` calls `recordBuildComplete` when `canMarkBuildDone` indicates health `GREEN`.

2.  **Integration Tests**:
    *   Send a `POST` request to `/build/start` with valid data and assert a `200 OK` or `201 Created` response. Verify the internal state (e.g., database entry for build start).
    *   Simulate a `RED` health state for `canMarkBuildDone` (e.g., via mocking or direct service manipulation) and send a `POST` request to `/build/complete`. Assert a `409 Conflict` response. Verify `recordBuildComplete` was *not* called.
    *   Simulate a `GREEN` health state for `canMarkBuildDone` and send a `POST` request to `/build/complete` with valid data. Assert a `2