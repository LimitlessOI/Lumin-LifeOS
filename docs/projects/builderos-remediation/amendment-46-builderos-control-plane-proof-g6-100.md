# Amendment 46 BuilderOS Control Plane Proof G6-100 Remediation

This document outlines the necessary implementation steps to close the proof gap identified in Amendment 46, specifically addressing the wiring of BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js`. This remediation focuses on enabling the BuilderOS governed loop execution without modifying LifeOS user features or TSOS customer-facing surfaces.

## 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints to manage the lifecycle of a BuilderOS build process. Specifically, the following functionalities are missing:
-   A `POST /build/start` endpoint to initiate a build, requiring `task_id`, `blueprint_id`, and `model_used` parameters, which should internally call `recordBuildStart`.
-   A `POST /build/complete` endpoint to finalize a build, requiring a `token` and `oil_receipt_ids`, which should internally call `recordBuildComplete`. This endpoint also requires a pre-check using `canMarkBuildDone` to ensure system health, returning a 409 Conflict status if the health check fails (i.e., health is RED).

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding the two specified POST routes to `routes/lifeos-council-builder-routes.js`. This includes:
-   Defining a new `POST` route for `/build/start` that extracts `task_id`, `blueprint_id`, and `model_used` from the request body and passes them to an imported `recordBuildStart` function.
-   Defining a new `POST` route for `/build/complete` that first calls an imported `canMarkBuildDone` function. If `canMarkBuildDone` returns `false`, it should immediately respond with a 409 status. Otherwise, it extracts `token` and `oil_receipt_ids` from the request body and passes them to an imported `recordBuildComplete` function.

## 3. Exact Safe-Scope Files to Touch First

The primary file to be modified is:
-   `routes/lifeos-council-builder-routes.js`

It is assumed that the internal functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are already implemented and exposed for import from an existing internal service or utility module (e.g.,