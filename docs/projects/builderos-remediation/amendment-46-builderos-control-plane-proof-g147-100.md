# Amendment 46 BuilderOS Control Plane Proof - G147-100 Remediation Blueprint Note

This document outlines the remediation steps and proof for closing the implementation gap identified in Amendment 46 concerning the BuilderOS Control Plane. The previous submission failed due to incorrect file type interpretation by the verifier, as JavaScript code was placed directly within a Markdown file. This blueprint details the correct implementation approach for `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of wired endpoints in `routes/lifeos-council-builder-routes.js` to manage the build lifecycle, specifically:
-   Recording build start events.
-   Recording build completion events, including OIL receipt IDs.
-   Enforcing build completion conditions based on system health via `canMarkBuildDone`.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
-   Adding two `POST` routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
-   Implementing handlers for these routes that call internal control plane services (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`).
-   Ensuring proper request body parsing and response handling, including a 409 conflict response when `canMarkBuildDone` indicates a RED health state.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to include the new routes and their logic.
-   `services/builderControlPlaneService.js` (or similar existing service module): This module is expected to contain (or will be extended to contain) the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. If this service module does not exist, it should be created within the `services/` directory, adhering to existing service patterns.

## 4. Verifier/Runtime Checks

To verify the implementation:
-   **Build Start:**
    -   Send `POST /build/start` to `routes/lifeos-council-builder-routes.js` with a JSON body: `{ "task_id": "some-task-id", "blueprint_id": "some-blueprint-id", "model_used": "g147" }`.
    -   Expected outcome: HTTP 200 OK. Verify that `recordBuildStart` was called internally with the correct parameters and that the build start event is logged/persisted.
-   **Build Complete (Success):**
    -   Send `POST /build/complete` to `routes/lifeos-council-builder-routes.js` with a JSON body: `{ "token": "build-session-token", "oil_receipt_ids": ["receipt-1", "receipt-2"] }`.
    -   Expected outcome: HTTP 200 OK. Verify that `recordBuildComplete` was called internally with the correct parameters and that the build completion event is logged/persisted.
-   **Build Complete (Health RED - Conflict):**
    -   Simulate a system state where `canMarkBuildDone()` returns `false` (e.g., health is RED).
    -   Send `POST /build/complete` with valid completion data.
    -   Expected outcome: HTTP 409 Conflict. Verify that `recordBuildComplete` was *not* called.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If any of the `POST /build` endpoints return unexpected HTTP status codes (e.g., 404, 500 instead of 200/409).
-   If internal service calls (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are not invoked or are invoked with incorrect parameters.
-   If build state is not correctly recorded or updated in the underlying data store.
-   If the `canMarkBuildDone` health check does not correctly prevent build completion when health is RED, or incorrectly prevents it when health is GREEN.

This blueprint provides the necessary guidance for the next C2 build pass to correctly implement the BuilderOS control plane wiring.