<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G555 100. -->

### Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane - G555-100 Remediation

This document outlines the remediation plan and proof for closing the implementation gap identified during the OIL verifier rejection for Amendment 46. The primary goal is to correctly wire the BuilderOS control plane endpoints in `routes/lifeos-council-builder-routes.js` to manage build lifecycle events and enforce health-based completion conditions.

---

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of robust, health-aware endpoint implementations within `routes/lifeos-council-builder-routes.js` for managing the BuilderOS build lifecycle. Specifically:
-   Missing `POST /build/start` endpoint to initiate a build and record its start parameters (`task_id`, `blueprint_id`, `model_used`).
-   Missing `POST /build/complete` endpoint to finalize a build, record completion details (token, OIL receipt IDs), and enforce a health-based pre-condition for completion.
-   Lack of integration with a `canMarkBuildDone` health check mechanism to prevent build completion when the BuilderOS health is in a RED state, requiring a 409 conflict response in such scenarios.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Defining two new POST routes in `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
2.  Implementing the request handlers for these routes to:
    *   For `/build/start`: Extract `task_id`, `blueprint_id`, `model_used` from the request body and call an internal `builderControlService.recordBuildStart()` function.
    *   For `/build/complete`: Extract `token` and `oil_receipt_ids` from the request body. Before calling `builderControlService.recordBuildComplete()`, invoke `builderControlService.canMarkBuildDone()`. If `canMarkBuildDone()` returns `false` (indicating RED health), immediately return a 409 HTTP status code. Otherwise, proceed to call `builderControlService.recordBuildComplete()`.
3.  Ensuring `builderControlService` (or equivalent) provides the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. These functions are assumed to exist or will be added to an existing builder-specific service layer.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will receive the primary modifications for defining the new routes and their handlers.
-   `services/builderControlService.js` (or similar existing builder service file): This file is the logical place to implement or extend the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If such a service does not exist, a new one would be created following existing patterns. For this remediation, we assume `services/builderControlService.js` is the target.

### 4. Verifier/Runtime Checks

To validate the implementation:

*   **Unit Tests (`routes/lifeos-council-builder-routes.test.js`):**
    *   Verify `POST /build/start` successfully calls `builderControlService.recordBuildStart` with the correct `task_id`, `blueprint_id`, and `model_used` from the request body.
    *   Verify `POST /build/complete` successfully calls `builderControlService.recordBuildComplete` with the correct `token` and `oil_receipt_ids` when `builderControlService.canMarkBuildDone` returns `true`.
    *   Verify `POST /build/complete` returns a 409 status code and *does not* call `builderControlService.recordBuildComplete` when `builderControlService.canMarkBuildDone` returns `false`.
*   **Integration Tests (`e2e/builder-lifecycle.test.js`):**
    *   Perform a full lifecycle test: `POST /build/start` -> perform simulated build work -> `POST /build/complete`. Assert successful responses and expected state changes (e.g., database entries, logs).
    *   Simulate a RED health state (e.g., by mocking `builderControlService.canMarkBuildDone` to return `false`) and attempt `POST /build/complete`. Assert a 409 response.
*   **Manual Verification (Staging/Dev Environment):**
    *   Use `curl` or a similar tool to hit the `/build/start` and `/build/complete` endpoints with valid and invalid payloads.
    *   Monitor BuilderOS logs for successful event recording.
    *   Manually trigger a RED health state (if possible) and confirm the 409 behavior for `/build/complete`.

### 5. Stop Conditions if Runtime Truth Disagrees

The implementation should be halted and re-evaluated if any of the following conditions are met during testing or initial deployment:

*   **Incorrect Data Recording:** `recordBuildStart` or `recordBuildComplete` functions are called with incorrect parameters, or the recorded data (e.g., in a database) does not match the input.
*   **Inconsistent 409 Behavior:** The `/build/complete` endpoint does not reliably return a 409 when `canMarkBuildDone` indicates a RED health state, or returns 409 when health is GREEN.
*   **Unexpected Side Effects:** Any existing BuilderOS or LifeOS functionality is negatively impacted or exhibits regressions due to these changes.
*   **Performance Degradation:** Significant latency increases or resource consumption spikes are observed on the BuilderOS control plane endpoints under expected load.
*   **Security Vulnerabilities:** Introduction of new, exploitable pathways (e.g., unauthenticated access to control plane functions, injection vulnerabilities).

---