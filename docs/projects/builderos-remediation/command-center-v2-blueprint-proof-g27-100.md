# Command Center V2 Blueprint Proof: G27-100 - Command Status Reporting

This document addresses the next smallest build slice derived from the Command Center V2 Blueprint, focusing on closing a critical gap in command execution feedback.

## 1. Exact Missing Implementation or Proof Gap

The Command Center V2 Blueprint defines the dispatch and execution of commands via `CommandExecutors`. However, a concrete, standardized mechanism for these `CommandExecutors` to report their final execution status (e.g., `SUCCESS`, `FAILURE`, `TIMEOUT`) and any associated output or error messages back to the `CommandCenterV2` is not explicitly implemented. This gap prevents the Command Center from maintaining an accurate, real-time, and persistent record of command outcomes, which is crucial for auditing, UI updates, and subsequent automated actions.

## 2. Smallest Safe Build Slice to Close It

Implement a dedicated API endpoint within the `CommandCenterV2` responsible for receiving and persisting command execution status updates. This endpoint will serve as the primary channel for `CommandExecutors` to signal their completion and outcome.

**Endpoint Specification:**
*   **Method:** `POST`
*   **Path:** `/command-center/v2/command-status`
*   **Request Body (JSON):**
    ```json
    {
      "commandId": "string", // Unique ID of the command being updated
      "status": "string",    // e.g., "SUCCESS", "FAILURE", "RUNNING", "TIMEOUT"
      "output": "string",    // Optional: stdout/stderr or summary message
      "error": "string",     // Optional: detailed error message if status is FAILURE
      "timestamp": "ISO 8601 string" // Time of status update
    }
    ```
*   **Response:** `200 OK` on successful update, `400 Bad Request` for invalid input, `500 Internal Server Error` for persistence issues.

## 3. Exact Safe-Scope Files to Touch First

To implement this slice, the following files are within safe scope and should be touched first:

*   `src/routes/commandCenterV2.js`: Add the new `POST /command-center/v2/command-status` route handler. This file will be responsible for receiving the HTTP request and delegating to a service layer.
*   `src/services/commandStatusService.js`: Create this new service file. It will contain the business logic for validating the incoming status update, interacting with the data store (e.g., `Command` model), and persisting the status and associated details.
*   `src/models/Command.js`: Extend the existing `Command` model (assuming it exists) to include fields for `currentStatus`, `lastOutput`, `lastError`, and `lastUpdatedTimestamp`. If a separate `CommandStatus` model is deemed necessary for historical tracking, create `src/models/CommandStatus.js` and define its schema. For this smallest slice, extending `Command.js` is preferred to avoid unnecessary complexity.
*   `src/schemas/commandStatusSchema.js`: Create this new file to define Joi or similar validation schema for the incoming `POST /command-center/v2/command-status` request body.

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `src/services/commandStatusService.test.js`: Verify that `updateCommandStatus` function correctly updates the `Command` model in the database with the provided status, output, and error. Test edge cases like invalid `commandId` or malformed status.
*   **Integration Tests:**
    *   `src/routes/commandCenterV2.integration.test.js`: Send a `POST` request to `/command-center/v2/command-status` with valid and invalid payloads. Assert that the endpoint returns the expected HTTP status codes (200, 400) and that the database reflects the status change for valid requests.
*   **Manual Verification:**
    *   Trigger a test command execution (if possible).
    *   Manually send a `POST` request to `/command-center/v2/command-status` simulating a `CommandExecutor` reporting success or failure.
    *   Verify that the Command Center UI (if available) or direct database query shows the updated command status and details.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **API Endpoint Failure:** If the `POST /command-center/v2/command-status` endpoint consistently returns 4xx or 5xx errors during integration or manual testing, indicating a fundamental issue with routing, validation, or handler logic.
*   **Data Inconsistency:** If the command status or associated details persisted in the database do not accurately reflect the data sent in the API request, suggesting a data mapping or persistence bug.
*   **UI Discrepancy:** If the Command Center UI (assuming it consumes this status) does not update or displays incorrect status information after a successful API call and database persistence.
*   **Performance Degradation:** If introducing this endpoint or its underlying service logic causes a measurable degradation in the performance of existing Command Center functionalities or other LifeOS services.
*   **Security Vulnerability:** If any security scan or manual review identifies a vulnerability introduced by the new endpoint (e.g., improper authorization, injection risks).
*   **Blueprint Deviation:** If the implemented solution deviates significantly from the spirit or intent of the `COMMAND_CENTER_V2_BLUEPRINT.md` (once available for full review), indicating a misunderstanding of the overall architecture.