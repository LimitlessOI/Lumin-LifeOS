<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G595 100. -->

The specification asks for a `.md` file, but the OIL verifier rejects `.md` files as unknown file extensions for execution, indicating a contradiction in expected file type by the verifier.
Amendment 12 Command Center Proof G595-100: Command Execution Trigger
This proof-closing blueprint note addresses the initial implementation slice for triggering command execution within the Command Center.
---
1. Exact Missing Implementation or Proof Gap
The current system lacks a mechanism to programmatically initiate the execution of a defined command via an apiEP. While command definitions and listing may exist, the critical gap is the API surface and underlying service logic to accept a request to execute a specific command, pass necessary parameters, and queue it for processing by the BuilderOS command execution engine. This gap prevents external systems or internal BuilderOS components from programmatically triggering command workflows.

2. Smallest Safe Build Slice to Close It
Implement a new BuilderOS-scoped API endpoint to trigger command execution. This slice focuses solely on the API surface and the immediate service layer interaction to initiate a command, without delving into the full command execution lifecycle or complex state management.
    *   **API Endpoint Definition**: Create a `POST` endpoint (e.g., `/builderos/commands/{commandId}/execute`) that accepts a JSON payload containing execution parameters. The `{commandId}` path parameter identifies the command to be executed.
    *   **Request Validation**: Implement robust schema validation for the incoming request payload (e.g., `commandId` presence and format, `parameters` object structure and types).
    *   **Service Layer Integration**: Call an existing or new BuilderOS internal service function (e.g., `commandExecutionService.triggerCommand(commandId, parameters)`) that handles the actual queuing or initiation of the command. This function should be responsible for interfacing with the core command execution engine.
    *   **Response**: Return a clear HTTP status (e.g., 202 Accepted) and a confirmation payload indicating whether the command trigger was successfully accepted for processing, including a unique execution ID if available.

3. Exact Safe-Scope Files to Touch First
*   `src/builderos/api/commandRouter.js`: Add the new `POST /builderos/commands/{commandId}/execute` route and its corresponding handler function. This file is responsible for defining BuilderOS API routes.
*   `src/builderos/services/commandExecutionService.js`: Implement or extend the `triggerCommand(commandId, parameters)` function. This service will contain the business logic to validate the command ID against known commands and pass the execution request to the underlying command queuing system.
*   `src/builderos/schemas/commandExecutionSchema.js`: Define the validation schema (e.g., using Joi or Zod) for the request body of the `/builderos/commands/{commandId}/execute` endpoint.
*   `docs/api/builderos/command-execution.md`: Document the new API endpoint, including its path, HTTP method, request body schema, example requests, and expected responses (success and error cases).

4. Verifier/Runtime Checks
*   **API Reachability**: `curl -X POST -H "Content-Type: application/json" -d '{}' http://localhost:PORT/builderos/commands/test-command-id/execute` should return a 400 (Bad Request) due to schema validation, not a 404 or connection error. This verifies the route is active and basic validation is in place.
*   **Successful Trigger**: `curl -X POST -H "Content-Type: application/json" -d '{"parameters": {"env": "dev", "target": "feature-branch"}}' http://localhost:PORT/builderos/commands/valid-command-id/execute` should return a 202 (Accepted) or 200 (OK) with a confirmation payload. Logs should indicate the command was successfully queued or initiated by `commandExecutionService`.
*   **Invalid Command ID**: `curl -X POST ... /builderos/commands/non-existent-id/execute` should return a 404 (Not Found) or 422 (Unprocessable Entity) if the `commandId` path parameter does not correspond to a recognized command.
*   **Parameter Validation**: Test with missing or malformed parameters in the request body to ensure appropriate 400 responses are returned, detailing the validation failures.

5. Stop Conditions if Runtime Truth Disagrees
*   The API endpoint is not exposed or returns unexpected HTTP status codes (e.g., 500 for valid input, or 404 for the correct path).
*   Successful API calls do not result in the command being queued or initiated in the BuilderOS backend, as evidenced by system logs or monitoring.
*   Security vulnerabilities are identified, such as unauthorized users being able to trigger commands, or command injection possibilities through parameters.