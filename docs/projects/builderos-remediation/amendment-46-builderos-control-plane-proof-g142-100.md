<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G142-100 Remediation -->

# Amendment 46: BuilderOS Control Plane Proof - G142-100 Remediation

## Proof-Closing Blueprint Note

This document addresses the OIL verifier rejection by detailing the necessary implementation to wire the BuilderOS control plane routes as specified, ensuring proper build lifecycle management and health-based completion gating.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of specific `POST` endpoints within `routes/lifeos-council-builder-routes.js` to manage the start and completion of BuilderOS builds. This includes:
- A `/build/start` endpoint to initiate a build record, accepting `task_id`, `blueprint_id`, and `model_used`.
- A `/build/complete` endpoint to finalize a build record, accepting a `token` and `OIL receipt IDs`.
- Conditional logic within the `/build/complete` handler to enforce a 409 conflict response if the system's health status (as determined by `canMarkBuildDone`) prevents build completion.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
- Adding two new `POST` route definitions to `routes/lifeos-council-builder-routes.js`.
- Implementing route handlers that parse incoming request bodies for the required parameters.
- Integrating calls to internal builder service functions: `recordBuildStart({ task_id, blueprint_id, model_used })`, `recordBuildComplete({ token, oil_receipt_ids })`, and `canMarkBuildDone()`.
- Implementing the conditional 409 response based on the boolean result of `canMarkBuildDone()`.

### 3. Exact Safe-Scope Files to Touch First

- `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their handlers.
- `services/builder-service.js` (assumed): This file (or an equivalent builder controller/service) would contain the implementations for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. For this C2 build pass, we assume these functions exist or will be stubbed for initial route wiring.

### 4. Verifier/Runtime Checks

1.  **Build Start Endpoint Test:**
    -   **Method:** `POST`
    -   **Path:** `/build/start`
    -   **Body:** `{ "task_id": "test-task-123", "blueprint_id": "bp-456", "model_used": "g142" }`
    -   **Expected Outcome:** HTTP 200 OK or 202 Accepted. Verify `recordBuildStart` is invoked internally with the correct payload.
2.  **Build Complete Endpoint Test (Success Path):**
    -   **Precondition:** Ensure `canMarkBuildDone()` returns `true`.
    -   **Method:** `POST`
    -   **Path:** `/build/complete`
    -   **Body:** `{ "token": "build-token-xyz", "oil_receipt_ids": ["oil-rec-1", "oil-rec-2"] }`
    -   **Expected Outcome:** HTTP 200 OK or 202 Accepted. Verify `recordBuildComplete` is invoked internally with the correct payload.
3.  **Build Complete Endpoint Test (Failure Path - Health RED):**
    -   **Precondition:** Configure system such that `canMarkBuildDone()` returns `false` (simulating health RED).
    -   **Method:** `POST`
    -   **Path:** `/build/complete`
    -   **Body:** `{ "token": "build-token-xyz", "oil_receipt_ids": ["oil-rec-1", "oil-rec-2"] }`
    -   **Expected Outcome:** HTTP 409 Conflict. Verify `recordBuildComplete` is *not* invoked.

### 5. Stop Conditions if Runtime Truth Disagrees

-   Any of the specified HTTP status codes (200/202, 409) are not returned as expected for the respective test cases.
-   Internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are not called, are called with incorrect arguments, or throw unexpected errors during testing.
-   The `/build/start` or `/build/complete` routes return 404 Not Found.
-   The `canMarkBuildDone` check is bypassed, allowing build completion when health is RED.