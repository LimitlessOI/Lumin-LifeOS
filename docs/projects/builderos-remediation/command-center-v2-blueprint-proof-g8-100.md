The source blueprint `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md` was not provided, requiring inference for the build slice.
Command Center V2 Blueprint Proof - G8-100
This document outlines the next smallest build slice for the Command Center V2, derived from the core blueprint. The focus is on establishing foundational data structures and a minimal read-only API for internal BuilderOS consumption.
---
Blueprint Note: Next Smallest Build Slice

1.  **Exact Missing Implementation or Proof Gap:**
    The core `BuildJob` entity schema is undefined, and there is no mechanism to retrieve `BuildJob` instances. This gap prevents any further development requiring persistent `BuildJob` state or read access for BuilderOS internal tooling.

2.  **Smallest Safe Build Slice to Close It:**
    Define the `BuildJob` entity schema and implement a read-only data access layer (repository) for `BuildJob` entities, including a `getBuildJobById(id)` function. This slice focuses purely on data definition and retrieval, avoiding write operations or complex business logic.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `src/builder-os/schemas/build-job.js`: Defines the `BuildJob` entity schema (e.g., using Joi or a simple object literal for validation).
    *   `src/builder-os/data/build-job-repository.js`: Implements `getBuildJobById(id)` to fetch `BuildJob` data from a mock or placeholder data source (e.g., an in-memory map) for initial proof, or connects to a designated BuilderOS internal database.
    *   `src/builder-os/api/routes/build-job-routes.js`: Exposes a minimal internal BuilderOS API endpoint, e.g., `GET /builder-os/v2/build-jobs/:id`, which uses the `build-job-repository`.

4.  **Verifier/Runtime Checks:**
    *   **Unit Test:** `build-job-repository.test.js` verifies `getBuildJobById` returns a `BuildJob` object conforming to the defined schema for a known ID.
    *   **Integration Test:** An API test verifies `GET /builder-os/v2/build-jobs/:id` returns a 200 OK status and a `BuildJob` object with expected structure and data for a valid ID.
    *   **Manual Check (BuilderOS Console):** Attempt to query the new endpoint directly using `curl` or a similar tool from within the BuilderOS environment to confirm accessibility and data format.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   `getBuildJobById` returns `null` or `undefined` for an ID that should exist.
    *   `getBuildJobById` returns data that does not conform to the `build-job.js` schema.
    *   The `GET /builder-os/v2/build-jobs/:id` endpoint returns a non-200 status code for a valid request.
    *   The `GET /builder-os/v2/build-jobs/:id` endpoint returns data with an incorrect structure or missing fields.
    *   Any attempt to introduce write operations or complex business logic into this slice.