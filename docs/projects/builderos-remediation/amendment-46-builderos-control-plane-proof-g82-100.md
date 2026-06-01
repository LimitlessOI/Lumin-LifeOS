# Amendment 46: BuilderOS Control Plane Proof - G82-100

## Proof-Closing Blueprint Note: Builder Control Plane Wiring

This note addresses the implementation gap for wiring the BuilderOS control plane endpoints within `routes/lifeos-council-builder-routes.js` as specified by Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of dedicated `POST /build/start` and `POST /build/complete` endpoints in `routes/lifeos-council-builder-routes.js`. These endpoints are crucial for BuilderOS to signal build lifecycle events and enforce control plane policies, specifically the `canMarkBuildDone` check under health RED conditions.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`.
*   Implementing placeholder functions for `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`, and `getSystemHealth` within a new or existing BuilderOS-specific service (e.g., `services/builderControlService.js`).
*   Integrating these service functions into the route handlers.
*   Ensuring the `409 Conflict` response is returned when `canMarkBuildDone` fails and system health is RED for the `/build/complete` endpoint.

### 3. Exact Safe-Scope Files to Touch First

1.  `routes/lifeos-council-builder-routes.js`: To define the new POST routes.
2.  `services/builderControlService.js` (new file, or extend an existing builder-specific service): To encapsulate the build control logic.

### 4. Verifier/Runtime Checks

To verify the implementation:

*   **Test `POST /build/start`:**
    *   **Request:** `POST /build/start` with JSON body: `{ "task_id": "t-123", "blueprint_id": "bp-456", "model_used": "gemini-flash" }`
    *   **Expected Outcome:** HTTP 202 Accepted. Internal logs/metrics should show `recordBuildStart` invoked with the provided payload.
*   **Test `POST /build/complete` (Success Path - Health OK):**
    *   **Precondition:** Mock `getSystemHealth()` to return 'GREEN', `canMarkBuildDone()` to return `true`.
    *   **Request:** `POST /build/complete` with JSON body: `{ "token": "build-token-xyz", "oil_receipt_ids": ["oil-1", "oil-2"] }`
    *   **Expected Outcome:** HTTP 202 Accepted. Internal logs/metrics should show `recordBuildComplete` invoked with the provided payload.
*   **Test `POST /build/complete` (Success Path - `canMarkBuildDone` true, Health RED):**
    *   **Precondition:** Mock `getSystemHealth()` to return 'RED', `canMarkBuildDone()` to return `true`.
    *   **Request:** `POST /build/complete` with JSON body: `{ "token": "build-token-xyz", "oil_receipt_ids": ["oil-1", "oil-2"] }`
    *   **Expected Outcome:** HTTP 202 Accepted. Internal logs/metrics should show `recordBuildComplete` invoked. (The 409 only triggers if `canMarkBuildDone` is false *and* health is RED).
*   **Test `POST /build/complete` (Failure Path - `canMarkBuildDone` false, Health RED):**
    *   **Precondition:** Mock `getSystemHealth()` to return 'RED', `canMarkBuildDone()` to return `false`.
    *   **Request:** `POST /build/complete` with JSON body: `{ "token": "build-token-xyz", "oil_receipt_ids": ["oil-1", "oil-2"] }`
    *   **Expected Outcome:** HTTP 409 Conflict. `recordBuildComplete` should *not* be invoked.
*   **Test `POST /build/complete` (Success Path - `canMarkBuildDone` false, Health GREEN):**
    *   **Precondition:** Mock `getSystemHealth()` to return 'GREEN', `canMarkBuildDone()` to return `false`.
    *   **Request:** `POST /build/complete` with JSON body: `{ "token": "build-token-xyz", "oil_receipt_ids": ["oil-1", "oil-2"] }`
    *   **Expected Outcome:**