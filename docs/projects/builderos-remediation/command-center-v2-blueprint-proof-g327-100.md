<!-- SYNOPSIS: Documentation — Command Center V2 Blueprint Proof G327 100. -->

### Command Center V2 Blueprint Proof: g327-100 - Implement Command Creation API

This document details the next smallest build slice for Command Center V2, focusing on implementing the API endpoint and service logic for creating new `Command` entities. This builds upon the initial `Command` data model and list API, addressing the need for write operations.

**1. Exact Missing Implementation or Proof Gap:**
The current system lacks a mechanism to create new `Command` entities. Specifically, the `POST /api/commands` endpoint and its underlying service logic for persisting a new command to the database are missing. This gap prevents users from defining new commands within the BuilderOS.

**2. Smallest Safe Build Slice to Close It:**
Implement the `POST /api/commands` API endpoint to allow for the creation of new `Command` entities. This slice includes:
*   Defining the API route within the command router.
*   Implementing the service layer logic for command creation, including data validation and persistence to the database.
*   Ensuring proper error handling and response formatting for both success and failure scenarios.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/api/command/command.routes.js`: Add a `POST` route for `/api/commands` that maps to a controller function.
*   `src/services/command.service.js`: Implement a `createCommand(commandData)` function responsible for business logic and database interaction.
*   `src/schemas/command.schema.js`: Define or extend the Joi/validation schema for the `Command` creation request body.
*   `src/api/command/command.controller.js`: Implement a `createCommandController` function to handle the request, call the service, and send the response.

**4. Verifier/Runtime Checks:**
*   **API Test (Success):** Send a `POST` request to `/api/commands` with a valid `Command` payload. Expect a `201 Created` status and the newly created command object in the response.
*   **Database Check:** Verify that the command sent in the `POST` request is successfully persisted in the database with all provided fields.
*   **Validation Test (Failure):** Send a `POST` request with an invalid or incomplete `Command` payload (e.g., missing required fields, invalid data types). Expect a `400 Bad Request` status and appropriate validation error messages.
*   **Error Handling:** Simulate a database write failure or other internal server error during command creation and verify the API returns an appropriate `500 Internal Server Error` with a generic message.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   The `POST /api/commands` endpoint returns `404 Not Found` or any other unexpected HTTP status code.
*   A valid `POST` request returns a status other than `201 Created` or `400 Bad Request` for invalid input.
*   The created command is not found in the database after a seemingly successful API call.
*   Invalid payloads are accepted and persisted, or valid payloads are rejected due to incorrect validation logic.
*   Any unhandled exceptions or crashes occur in the application during the command creation process.