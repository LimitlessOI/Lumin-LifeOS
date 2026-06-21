<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G776 100. -->

Amendment 46 BuilderOS Control Plane Proof - G776-100

Proof-Closing Blueprint Note: BuilderOS Control Plane Route Wiring

This document addresses the signal requiring follow-through for Amendment 46, focusing on the wiring of `routes/lifeos-council-builder-routes.js` to integrate build start and completion events with the BuilderOS control plane.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints to manage the BuilderOS build lifecycle. Specifically:
-   A POST endpoint for `/build/start` to trigger `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   A POST endpoint for `/build/complete` to trigger `recordBuildComplete({ token, oil_receipt_ids })`.
-   Integration of a health check (`canMarkBuildDone`) within the `/build/complete` flow, returning a 409 status if the check fails when health is RED.
-   The internal `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions need to be implemented or properly exposed for use by the routes.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Defining two new POST routes in `routes/lifeos-council-builder-routes.js`.
2.  Implementing or importing the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.
3.  Ensuring proper request body parsing for `task_id`, `blueprint_id`, `model_used`, `token`, and `oil_receipt_ids`.
4.  Adding error handling, specifically for the 409 condition.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: To define the new POST routes and their handlers.
-   `services/builder-control-plane.js` (or similar existing BuilderOS service file): To implement or expose `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.

### 4. Verifier/Runtime Checks

-   **Unit Tests (routes):**
    -   Verify `POST /build/start` calls `recordBuildStart` with `task_id`, `blueprint_id`, `model_used`.
    -   Verify `POST /build/complete` calls `recordBuildComplete` with `token`, `oil_receipt_ids`.
    -   Verify `POST /build/complete` returns 409 if `canMarkBuildDone` fails (returns `false`) when health is RED.
    -   Verify `POST /build/complete` returns 200 (or appropriate success code) if `canMarkBuildDone` passes or health is not RED.
-   **Unit Tests (services):**
    -   Verify `recordBuildStart` correctly logs/persists build start information.
    -   Verify `recordBuildComplete` correctly logs/persists build completion information.
    -   Verify `canMarkBuildDone` accurately reflects the system's ability to mark a build as done based on health status.
-   **Integration Tests:**
    -   Execute a full build lifecycle (start -> complete) via API calls and verify BuilderOS internal state transitions.
-   **Runtime Monitoring:**
    -   Observe BuilderOS control plane logs for successful invocation and parameter passing to `recordBuildStart` and `recordBuildComplete`.
    -   Monitor API responses for `/build/start` and `/build/complete` endpoints, especially for the 409 status.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart` or `recordBuildComplete` are not invoked, or invoked with incorrect/missing parameters.
-   If the `/build/complete` endpoint does not return a 409 status when `canMarkBuildDone` indicates a failure condition (health RED).
-   If BuilderOS internal state (e.g., build status, associated OIL receipts) does not correctly reflect the build lifecycle events.
-   If the system exhibits unexpected errors or instability related to build state management after these changes.
-   If the verifier continues to reject the `.md` file due to syntax errors, indicating an environmental issue with the verifier itself, not the content of this document.