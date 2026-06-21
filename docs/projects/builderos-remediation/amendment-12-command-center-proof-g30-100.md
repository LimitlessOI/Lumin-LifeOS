<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G30 100. -->

AMENDMENT 12: COMMAND CENTER - Proof G30-100 - Build Slice: Trigger Build

This document outlines the proof-closing blueprint note for a critical build slice within Phase 2 (Basic Orchestration) of the Command Center development, specifically focusing on the ability to trigger new build processes. This slice contributes to achieving the G21-G40 goals and sets the foundation for automated build orchestration.

### Blueprint Note: Trigger Build Endpoint

**1. Exact Missing Implementation or Proof Gap:**
The current BuilderOS platform lacks a dedicated, authenticated API endpoint to programmatically initiate a build process. This gap prevents external systems or internal BuilderOS components from reliably requesting new builds, which is fundamental for automated orchestration. The immediate proof gap is demonstrating that a build initiation request can be successfully received, validated, and acknowledged by the BuilderOS core.

**2. Smallest Safe Build Slice to Close It:**
Implement a new POST API endpoint, `/api/v1/build/trigger`, that accepts a minimal JSON payload (e.g., `projectId`, `branch`, `initiatorId`). This endpoint will perform input validation, apply necessary authentication/authorization checks, and then enqueue a build initiation message into a designated internal queue (e.g., a message broker topic or an in-memory queue for initial proof-of-concept). The endpoint must respond with an HTTP 202 Accepted status upon successful enqueueing, indicating the request has been received for asynchronous processing. This slice focuses solely on the reception and acknowledgment of the build request, not the full build execution or status tracking.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/api/v1/build/routes.js`: Define the new POST `/trigger` route and associate it with the appropriate controller function.
*   `src/api/v1/build/controller.js`: Implement the `triggerBuild` controller function to handle request parsing, validation, and delegation to the build service.
*   `src/services/buildService.js`: Add a new `enqueueBuildRequest(payload)` function responsible for placing the validated build request onto the internal message queue.
*   `src/middleware/auth.js`: (If not already applied globally) Ensure the appropriate authentication and authorization middleware is applied to the new `/build/trigger` route.

**4. Verifier/Runtime Checks:**
*   **API Call Success:** Send a POST request to `http://localhost:<BUILDEROS_PORT>/api/v1/build/trigger` with a valid JSON payload (e.g., `{"projectId": "proj-abc", "branch": "main", "initiatorId": "user-xyz"}`). Verify the response is HTTP 202 Accepted.
*   **Log Verification:** Check BuilderOS application logs for an entry indicating "Build request enqueued for projectId: [ID], branch: [BRANCH]" or similar confirmation.
*   **Queue Inspection (if applicable):** If the internal queue is inspectable (e.g., a Redis stream, Kafka topic), verify that a new message corresponding to the build request appears in the queue with the correct payload.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   **API Call Failure:** The endpoint returns any HTTP status code other than 202 Accepted (e.g., 400 Bad Request for invalid payload, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error).
*   **No Log Entry:** No log entry confirming the build request enqueueing is found within a reasonable timeframe after the API call.
*   **Queue Mismatch:** If queue inspection is possible, the expected message is not found in the queue, or its content is incorrect/corrupted.
*   **Dependency Failure:** Any critical upstream service (e.g., authentication provider, project metadata service) fails, preventing the request from being processed or enqueued.

This blueprint note provides the necessary details for the next C2 build pass to implement the foundational build trigger mechanism, addressing the identified gap and setting the stage for further orchestration capabilities.