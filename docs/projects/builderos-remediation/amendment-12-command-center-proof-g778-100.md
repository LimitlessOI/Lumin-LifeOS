# Amendment 12 Command Center Proof - G778-100: Build Status Aggregation Endpoint

This document closes the proof for the initial build slice of Amendment 12, focusing on establishing the foundational data aggregation for the BuilderOS Command Center.

## Blueprint Note: Proof-Closing

### 1. Exact Missing Implementation or Proof Gap

The current BuilderOS Command Center blueprint lacks a dedicated, internal API endpoint for real-time aggregation and exposure of granular build pipeline status across all active projects. This gap prevents centralized monitoring and command issuance based on a unified, up-to-date view of build health.

### 2. Smallest Safe Build Slice to Close It

Establish a new BuilderOS internal API endpoint (`/api/v1/build-status`) that aggregates and returns the current status of all active build pipelines. This slice focuses solely on data exposure, not UI rendering or command issuance.

### 3. Exact Safe-Scope Files to Touch First

*   `src/builder-os/api/v1/build-status.js`: New file for the API endpoint handler logic. This will orchestrate data fetching from existing build services (e.g., `BuildService.getPipelineStatus()`).
*   `src/builder-os/services/build-data-aggregator.js`: New file for a service responsible for fetching, normalizing, and aggregating build status data from various internal BuilderOS sources.
*   `src/builder-os/router.js`: Update to register the new `/api/v1/build-status` route.

### 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `src/builder-os/services/build-data-aggregator.test.js`: Verify correct aggregation logic, error handling, and data normalization.
    *   `src/builder-os/api/v1/build-status.test.js`: Verify endpoint handler correctly calls the service and formats responses.
*   **Integration Tests:**
    *   `test/integration/builder-os-api.test.js`: Send a `GET` request to `/api/v1/build-status` and assert the response structure, status code (200 OK), and presence of expected build data.
*   **Manual Verification (Internal):**
    *   `curl -X GET http://localhost:PORT/api/v1/build-status` (replace PORT with BuilderOS internal API port).
    *   Verify JSON response contains an array of build statuses, each with `projectId`, `pipelineId`, `status` (e.g., `running`, `success`, `failed`), and `lastUpdated` fields.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **API Endpoint Failure:** The `/api/v1/build-status` endpoint returns a 4xx or 5xx HTTP status code.
*   **Data Inconsistency:** The aggregated build status data does not accurately reflect the actual state of active build pipelines as reported by underlying BuilderOS build services.
*   **Malformed Response:** The JSON response from the endpoint does not conform to the expected schema (e.g., missing critical fields, incorrect data types).
*   **Performance Degradation:** The endpoint response time exceeds 500ms under typical load, indicating an aggregation bottleneck.
*   **Security Violation:** The endpoint exposes sensitive information not intended for this scope or allows unauthorized access.