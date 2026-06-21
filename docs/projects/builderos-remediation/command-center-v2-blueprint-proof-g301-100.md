<!-- SYNOPSIS: Command Center V2 Blueprint Proof: G301-100 - Core Command Service Stub -->

# Command Center V2 Blueprint Proof: G301-100 - Core Command Service Stub

This document outlines the first proof-of-concept build slice for the Command Center V2 re-platforming, focusing on establishing the foundational `command-service`. This proof aims to validate the basic deployment and request-response cycle of the new service, without full business logic or data persistence.

---

## Blueprint Note: G301-100 Proof Closing

**1. Exact Missing Implementation or Proof Gap:**
The core `command-service` microservice does not yet exist or is not capable of receiving and acknowledging a basic command execution request. The immediate gap is the absence of a deployable service that can expose an endpoint for command execution and return a placeholder success response.

**2. Smallest Safe Build Slice to Close It:**
Implement a minimal `command-service` that exposes a single HTTP POST endpoint, `/execute`, capable of receiving a `commandId`. This endpoint will perform no actual command execution but will log the received command ID and return a static success response, indicating the service is operational and can process requests. This slice proves the service's ability to be deployed, receive network traffic, and respond.

**3. Exact Safe-Scope Files to Touch First:**
*   `services/command-service/package.json`: Initialize a new Node.js project, define dependencies (e.g., `express`), and add start scripts.
*   `services/command-service/src/app.js`: Set up an Express application instance.
*   `services/command-service/src/routes/command.js`: Define the `/execute` POST route handler.
*   `services/command-service/src/index.js`: Main entry point to start the Express server.
*   `services/command-service/Dockerfile`: Basic Dockerfile to containerize the service for deployment.

**4. Verifier/Runtime Checks:**
*   **Deployment Check:** Verify the `command-service` container starts successfully and is reachable via the API Gateway (e.g., `http://localhost:3000/command-service/execute` if running locally, or via the designated cluster ingress).
*   **Endpoint Reachability:** Send a `POST` request to the `/execute` endpoint with a simple JSON body, e.g., `{"commandId": "ping"}`.
*   **Response Validation:** Assert that the service responds with a `200 OK` status code and a JSON body similar to `{"status": "received", "commandId": "ping"}`.
*   **Logging Verification:** Check the `command-service` container logs to confirm that the received `commandId` ("ping") was logged by the service.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   The `command-service` fails to deploy or start.
*   The service returns any `5xx` HTTP status code.
*   The service returns a `4xx` HTTP status code for a valid request payload.
*   The response body does not match the expected structure or status.
*   The `commandId` is not logged by the service, indicating the request did not reach the handler as expected.