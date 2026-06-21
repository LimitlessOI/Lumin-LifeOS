<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G4 100. -->

### Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane - G4-100 Remediation

This note addresses the required implementation for wiring the BuilderOS build lifecycle events into the control plane, specifically within `routes/lifeos-council-builder-routes.js`, as per the signal requiring follow-through.

1.  **Exact Missing Implementation or Proof Gap:**
    The `routes/lifeos-council-builder-routes.js` module lacks the necessary POST endpoints to manage the BuilderOS build lifecycle. Specifically, the following are missing:
    *   A `POST /build/start` endpoint to initiate a build record via `recordBuildStart`.
    *   A `POST /build/complete` endpoint to finalize a build record via `recordBuildComplete`, incorporating a health check via `canMarkBuildDone` to prevent completion under adverse conditions.

2.  **Smallest Safe Build Slice to Close It:**
    Implement two new POST routes within `routes/lifeos-council-builder-routes.js` to handle build start and completion events.

    *   **`POST /build/start`:**
        *   Accepts `task_id`, `blueprint_id`, and `model_used` in the request body.
        *   Calls `builderCouncilController.recordBuildStart({ task_id, blueprint_id, model_used })`.
        *   Returns a 200 OK response upon successful recording.

    *   **`POST /build/complete`:**
        *   Accepts `token` and `oil_receipt_ids` in the request body.
        *   **Pre-condition Check:** Calls `builderCouncilController.canMarkBuildDone()`.
        *   If `canMarkBuildDone()` indicates a RED health status (i.e., fails), the endpoint must return a `409 Conflict` status code immediately, preventing build completion.
        *   Otherwise, calls `builderCouncilController.recordBuildComplete({ token, oil_receipt_ids })`.
        *   Returns a 200 OK response upon successful recording.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `routes/lifeos-council-builder-routes.js`: To define and implement the new POST routes.
    *   `controllers/builder-council-controller.js`: To ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are correctly implemented and exposed for use by the router. (Assumption: these functions are already defined or will be defined in this controller).

4.  **Verifier/Runtime Checks:**
    *   **Unit/Integration Tests:**
        *   Verify `POST /build/start` successfully invokes `builderCouncilController.recordBuildStart` with the correct payload and returns a 200 status.
        *   Verify `POST /build/complete` successfully invokes `builderCouncilController.recordBuildComplete` with the correct payload and returns a 20