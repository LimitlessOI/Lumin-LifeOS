<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G625 100. -->

### Proof-Closing Blueprint Note: Amendment 46 - BuilderOS Control Plane (G625-100)

This note addresses the implementation gap for wiring the BuilderOS control plane routes as specified in Amendment 46.

#### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of API endpoints within `routes/lifeos-council-builder-routes.js` to manage the lifecycle of a BuilderOS build process. Specifically, the following routes and their associated logic are missing:

*   A `POST /build/start` endpoint to initiate a build record, accepting `task_id`, `blueprint_id`, and `model_used`.
*   A `POST /build/complete` endpoint to finalize a build record, accepting a build `token` and `oil_receipt_ids`.
*   Integration of a health check mechanism (`canMarkBuildDone`) within the `/build/complete` endpoint to gate build completion, returning a 409 Conflict status if the system health is RED.

#### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:

1.  Defining two new `POST` routes within `routes/lifeos-council-builder-routes.js`.
2.  Implementing or integrating existing internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) into these routes.
3.  Ensuring robust request body parsing and validation for all required parameters (`task_id`, `blueprint_id`, `model_used`, `token`, `oil_receipt_ids`).
4.  Implementing the conditional 409 Conflict response based on the outcome of `canMarkBuildDone` for the `/build/complete` endpoint.

#### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: To define and implement the new API endpoints.
*   `services/build-control-service.js` (inferred): To house or orchestrate the business logic for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If these functions already exist in other modules, they should be imported and utilized.
*   `utils/health-check.js` (inferred): If `canMarkBuildDone` is part of a broader health utility, this file would be the source for its import.

#### 4. Verifier/Runtime Checks

*   **`POST /build/start` Endpoint:**
    *   Send a `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, and `model_used`. Verify a 200/201 status code and that a new build record is successfully created in the underlying data store.
    *   Send requests with missing or invalid parameters. Verify appropriate 400 Bad Request responses.
*   **