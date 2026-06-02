Amendment 12 Command Center Proof: G267-100 Follow-Through
Blueprint Note: Next Build Slice for Command Center API Access
This document outlines the next smallest blueprint-backed build slice following the completion of proof G267-100, which is assumed to have established the core data model and initial data ingestion for the Amendment 12 Command Center.
---
1. Exact Missing Implementation or Proof Gap
The current gap is the absence of programmatic, read-only access to the core event and metric data now residing in the PgSQL db. While data ingestion and storage are assumed to be functional (post-G267-100), there are no apiEPs available for the Command Center UI or other consumers to retrieve this critical operational data.

2. Smallest Safe Build Slice to Close It
Implement a minimal set of read-only API endpoints (apiEPs) for the Command Center's core event and metric data. This slice will focus on exposing existing data without modification capabilities, ensuring data integrity and minimizing surface area for errors. It will include basic filtering (e.g., by time range, type) and pagination to support UI consumption. This build slice specifically avoids any write operations, complex aggregations, or cross-service data joins.

3. Exact Safe-Scope Files to Touch First
*   `src/api/command-center/v1/events.js`: New module for handling event data retrieval routes and logic.
*   `src/api/command-center/v1/metrics.js`: New module for handling metric data retrieval routes and logic.
*   `src/api/command-center/index.js`: Update to aggregate and export the new `v1` API routes.
*   `src/db/command-center/queries.js`: New module containing SQL query functions for fetching events and metrics from the PgSQL database.
*   `src/db/command-center/index.js`: Update to export the new query functions.
*   `src/routes/index.js`: Update to register the `/api/v1/command-center` base route.
*   `src/schemas/command-center/event-schema.js`: New module defining Joi/Yup/Zod schema for event data validation.
*   `src/schemas/command-center/metric-schema.js`: New module defining Joi/Yup/Zod schema for metric data validation.

4. Verifier/Runtime Checks
*   **API Accessibility**: `GET /api/v1/command-center/events` and `GET /api/v1/command-center/metrics` return 200 OK with valid JSON data.
*   **Data Correctness**: Querying with specific `startDate`, `endDate`, `limit`, `offset` parameters returns the expected subset of data, matching direct database queries.
*   **Schema Validation**: API responses conform to the defined `event-schema.js` and `metric-schema.js`.
*   **Error Handling**: Invalid query parameters (e.g., malformed dates, negative limits) result in appropriate 400 Bad Request responses.
*   **Performance**: Basic load testing shows response times for typical queries remain under 200ms for a reasonable data volume (e.g., 1000 records).

5. Stop Conditions if Runtime Truth Disagrees
*   **API Unreachable**: If the new API endpoints consistently return 404 Not Found or 500 Internal Server Error for valid requests after deployment.
*   **Data Inconsistency**: If the data returned by the API does not accurately reflect the underlying database content, or if filtering/pagination logic is demonstrably incorrect.
*   **Schema Mismatch**: If API responses frequently fail schema validation, indicating a discrepancy between implementation and contract.
*   **Performance Degradation**: If average response times for simple queries exceed 500ms, indicating a potential bottleneck or inefficient query.
*   **Security Vulnerability**: Any identified vulnerability (e.g., SQL injection, unauthorized data access) immediately halts the build and requires remediation.