<!-- SYNOPSIS: Amendment 12 Command Center Proof - G875-100 Remediation Note -->

The source blueprint `docs/projects/AMENDMENT_12_COMMAND_CENTER.md` was not provided, requiring inference of its content for deriving the build slice.
```markdown
# Amendment 12 Command Center Proof - G875-100 Remediation Note

This document outlines the next smallest build slice to address the current implementation gap for the BuilderOS Command Center, as derived from the conceptual requirements of `AMENDMENT_12_COMMAND_CENTER.md`. This remediation focuses on establishing foundational data visibility for the Command Center.

## 1. Exact Missing Implementation or Proof Gap

The core capability to programmatically retrieve and display the current status of active and recently completed BuilderOS build jobs is not yet implemented or proven. This data is essential for the Command Center to provide real-time operational oversight.

## 2. Smallest Safe Build Slice to Close It

Implement a new, read-only API endpoint within BuilderOS that provides a paginated list of active and recently completed build jobs. This endpoint should include their unique ID, status (e.g., `QUEUED`, `RUNNING`, `SUCCESS`, `FAILED`, `CANCELLED`), start time, and end time (if applicable). This endpoint should query the underlying BuilderOS job store without modifying any job states.

## 3. Exact Safe-Scope Files to Touch First

*   `src/builder-os/api/v1/builds/list.js`: New module for the API endpoint handler (`GET /api/v1/builds`). This will encapsulate the logic for fetching and formatting build job data.
*   `src/builder-os/api/v1/routes.js`: Update to register the new `/api/v1/builds` route and link it to the `list.js` handler.
*   `src/builder-os/services/build-job-query.js`: New module providing an abstraction layer for querying build job data from the BuilderOS internal job store. This service will interact with the persistence layer.
*   `src/builder-os/models/build-job.js`: Review and potentially extend the existing `BuildJob` model (or define a new DTO if the existing model is too verbose for API responses) to ensure it supports the required status and metadata fields.

## 4. Verifier/Runtime Checks

*   **Unit Tests (`test/builder-os/api/v1/builds/list.test.js`):**
    *   Verify the endpoint returns a 200 OK response.
    *   Verify the response body is a JSON array of build objects.
    *   Verify correct pagination behavior (e.g., `limit`, `offset`).
    *   Verify filtering by status (e.g., `?status=RUNNING`).
    *   Verify the endpoint handles cases with no active builds gracefully (empty array).
*   **Integration Tests (`test/builder-os/integration/command-center-builds.test.js`):**
    *   Simulate the creation of several build jobs with different statuses.
    *   Call the `/api/v1/builds` endpoint and assert that the returned list accurately reflects the simulated jobs and their statuses.
    *   Verify that no BuilderOS job states are inadvertently modified by calling this read-only endpoint.
*   **Manual Runtime Verification (Staging Environment):**
    *   Deploy the changes to a staging environment.
    *   Use `curl` or a browser to access `/api/v1/builds`.