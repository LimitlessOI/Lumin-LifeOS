BuilderOS Remediation: Command Center V2 Blueprint - Todo 2 (G1)

This memo addresses the "Add 3 new endpoints to builder routes" task from the `COMMAND_CENTER_V2_BLUEPRINT.md`. The blueprint is not directly buildable due to open tasks and ambiguities regarding these endpoints. This document provides a builder-ready enhancement memo to proceed with the smallest buildable slice.

---

1.  **Blocking Ambiguity or Founder Decision List**
    *   **Endpoint Definitions:** The blueprint specifies "Add 3 new endpoints" but lacks specific details for each:
        *   **HTTP Method:** (GET, POST, PUT, DELETE) for each endpoint.
        *   **URL Path:** Exact path for each endpoint (e.g., `/builder/v2/commands/status`, `/builder/v2/commands/execute`, `/builder/v2/commands/:id/cancel`).
        *   **Request Schema:** Detailed JSON schema for request bodies (for POST/PUT).
        *   **Response Schema:** Detailed JSON schema for successful and error responses.
        *   **Authorization:** Specific roles or permissions required for each endpoint.
        *   **Business Logic:** High-level description of the operation each endpoint performs.
    *   **Data Models:** Are new data models required for Command Center V2, or do existing BuilderOS models suffice? If new, define their structure.

2.  **Already-Settled Constraints**
    *   **Architecture:** Follow existing BuilderOS Node/ESM architecture (routes -> controllers -> services -> data access).
    *   **Authentication:** Utilize existing BuilderOS authentication middleware.
    *   **Error Handling:** Adhere to BuilderOS standard error response formats and logging.
    *   **Input Validation:** All incoming requests must be validated against defined schemas.
    *   **Idempotency:** State-changing operations (POST/PUT/DELETE) must be designed for idempotency where applicable.
    *   **No Direct DB Access:** Controllers and routes must not directly interact with the database; delegate to services.
    *   **API Versioning:** Endpoints should be under `/v2/` to align with Command Center V2.

3.  **Smallest Buildable Next Slice**
    Implement a single, read-only endpoint: `GET /builder/v2/commands/status`.
    *   **Purpose:** Retrieve the overall status or a summary of recent command executions within BuilderOS.
    *   **Expected Response:** A JSON object containing an array of command statuses, including `commandId`, `status` (e.g., 'pending', 'running', 'completed', 'failed'), `timestamp`, and potentially `message`.
    *   **No Request Body:** This is a GET request.
    *   **Authorization:** Requires `builder:read` permission.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First**
    *   `src/builder/routes/v2/command-center-v2-routes.js` (New file, or extend `src/builder/routes/index.js` to include a new v2 router)
    *   `src/builder/controllers/v2/command-center-v2-controller.js` (New file)
    *   `src/builder/services/v2/command-center-v2-service.js` (New file, for mock data initially)
    *   `src/builder/schemas/v2/command-center-v2-schemas.js` (New file, for response schema)
    *   `src/builder/tests/v2/command-center-v2-routes.test.js` (New integration test file)
    *   `src/builder/tests/v2/command-center-v2-service.test.js` (New unit test file)

5.  **Required Verifier/Runtime Checks**
    *   **API Contract Validation:** Ensure the `GET /builder/v2/commands/status` endpoint returns a response conforming to its defined schema.
    *   **Authentication/Authorization:** Verify that requests without proper `builder:read` permissions are rejected with a 403 Forbidden.
    *   **Integration Tests:** A dedicated test suite for the new route, controller, and service interaction.
    *   **Unit Tests:** Comprehensive unit tests for the controller and service logic, including edge cases.
    *   **No Side Effects:** Verify that calling this GET endpoint does not alter any system state.

6.  **Stop Conditions**
    *   The `GET /builder/v2/commands/status` endpoint is fully implemented, tested, and deployed to a staging environment.
    *   All associated unit and integration tests pass with 100% coverage for the new code.
    *   The endpoint's functionality is verified manually and via automated checks.
    *   No regressions are introduced into existing BuilderOS functionality.
    *   The response schema for `GET /builder/v2/commands/status` is formally documented.