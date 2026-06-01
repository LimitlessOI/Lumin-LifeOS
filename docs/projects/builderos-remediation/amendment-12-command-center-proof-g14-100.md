# Amendment 12 Command Center Proof - G14-100: Initial Command Reception Proof

This document outlines the proof-closing blueprint note for the initial implementation slice of the BuilderOS Command Center, specifically focusing on the reception and basic logging of a 'ping' command. This addresses a foundational gap in establishing the Command Center's operational readiness.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of a functional entry point within the BuilderOS Command Center to receive and acknowledge a basic operational command. Specifically, the system lacks a defined handler and routing mechanism for a simple `builderos:ping` command, which is essential for proving the command reception pipeline.

## 2. Smallest Safe Build Slice to Close It

Implement a minimal API endpoint and corresponding internal handler within BuilderOS that:
1.  Listens for a `POST` request to `/builderos/command` with a payload containing `{"command": "builderos:ping"}`.
2.  Logs the reception of the `builderos:ping` command to the BuilderOS internal logs.
3.  Responds with a success status (e.g., HTTP 200 OK) and a simple acknowledgement payload (e.g., `{"status": "received", "command": "builderos:ping"}`).
This slice avoids complex command parsing, authentication, or side effects, focusing solely on the reception and acknowledgement mechanism.

## 3. Exact Safe-Scope Files to Touch First

*   `src/builderos/api/commandRouter.js`: Add a new route handler for `/builderos/command`.
*   `src/builderos/services/commandService.js`: Implement a new function `handlePingCommand()` that performs the logging.
*   `src/builderos/config/commands.js`: (If applicable, for command registration) Add `builderos:ping` to a list of known commands.
*   `src/builderos/tests/api/commandRouter.test.js`: Add a unit/integration test for the new `/builderos/command` endpoint.

## 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   Verify `commandService.handlePingCommand()` logs correctly.
    *   Verify `commandRouter.js` correctly routes `POST /builderos/command` requests with `builderos:ping` to the service.
*   **Integration Tests:**
    *   Send a `POST` request to `/builderos/command` with `{"command": "builderos:ping"}`.
    *   Assert HTTP 200 OK response with `{"status": "received", "command": "builderos:ping"}`.
    *   Verify the presence of "Received command: builderos:ping" in BuilderOS internal logs.
*   **Manual Verification (Dev Environment):**
    *   Deploy the build slice to a BuilderOS dev instance.
    *   Use `curl` or a similar tool to send the `builderos:ping` command.
    *   Observe the API response and check BuilderOS logs for the expected entry.

## 5. Stop Conditions if Runtime Truth Disagrees

*   The API endpoint returns any status other than HTTP 200 OK for the `builderos:ping` command.
*   The API response payload does not match the expected `{"status": "received", "command": "builderos:ping"}`.
*   The "Received command: builderos:ping" log entry is not found in BuilderOS internal logs after a successful API call.
*   Any unexpected errors or exceptions are thrown during the command reception or handling process.
*   The deployment of this slice causes regressions in existing BuilderOS functionality (checked via existing BuilderOS regression test suite).