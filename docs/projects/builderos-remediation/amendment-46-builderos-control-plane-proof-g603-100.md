<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G603 100. -->

Amendment 46 BuilderOS Control Plane Proof - G603-100

Proof-Closing Blueprint Note: Builder Control Plane Wiring Remediation

This document outlines the necessary implementation steps to wire the BuilderOS control plane routes as specified in Amendment 46, focusing on build start and completion events within `routes/lifeos-council-builder-routes.js`. This remediation addresses the identified gaps for the next C2 build pass.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of the required POST endpoints and their associated handler logic within `routes/lifeos-council-builder-routes.js` to manage BuilderOS build lifecycle events. Specifically:
-   Missing `POST /build/start` endpoint to trigger `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   Missing `POST /build/complete` endpoint to trigger `recordBuildComplete` with `token` and `OIL receipt IDs`.
-   Missing conditional logic within the `/build/complete` handler to check `canMarkBuildDone` and return a 409 status if it fails (e.g., when health is RED).

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
-   Adding two new POST route definitions to `routes/lifeos-council-builder-routes.js`.
-   Implementing the handler functions for these routes, ensuring proper request body parsing and validation.
-   Calling the internal `recordBuildStart` and `recordBuildComplete` functions with the specified parameters.
-   Integrating a call to `canMarkBuildDone` before `recordBuildComplete` in the `/build/complete` handler, and conditionally returning a 409.
-   Ensuring necessary imports for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are present or added.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will contain the new route definitions and their handler logic.
-   `services/builder-control-plane.js` (or similar existing internal service): If `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not yet defined or need modification, this is the logical place for their implementation. For this build pass, we assume these functions are either already available for import or will be stubbed/defined within the route file for immediate testing, with a follow-up task to move them to a dedicated service if not already there.

### 4. Verifier/Runtime Checks

**Verifier Checks (Static Analysis/Pre-deployment):**
-   **Syntax Validation:** Ensure `routes/lifeos-council-builder-routes.js` passes Node.js ESM syntax checks.
-   **Route Definition Scan:** Confirm the presence of `POST /build/start` and `POST /build/complete` routes.
-   **Function Call Trace:** Verify that `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are called within the respective route handlers.
-   **Error Handling Logic:** Confirm the presence of a conditional 409 response for `canMarkBuildDone` failure.

**Runtime Checks (Post-deployment/Integration Testing):**
-   **`/build/start` Success:** Send a `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, `model_used`. Expect a 200 OK response and observe successful internal logging/state update via `recordBuildStart`.
-   **`/build/complete` Success:** Send a `POST` request to `/build/complete` with valid `token` and `oil_receipt_ids` (assuming `canMarkBuildDone` returns true). Expect a 200 OK response and observe successful internal logging/state update via `recordBuildComplete`.
-   **`/build/complete` Health RED Failure:** Simulate a scenario