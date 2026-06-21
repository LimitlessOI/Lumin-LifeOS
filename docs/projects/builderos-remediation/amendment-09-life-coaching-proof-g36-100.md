<!-- SYNOPSIS: Documentation — Amendment 09 Life Coaching Proof G36 100. -->

Amendment 09: Life Coaching Integration - Proof G36-100: Initial Session Creation
This document outlines the next smallest build slice for Amendment 09, focusing on proving the foundational capability to create a new Life Coaching session record.
---
Proof-Closing Blueprint Note

1.  **Exact Missing Implementation or Proof Gap**:
    The core gap is the absence of a dedicated API endpoint and its underlying service logic to create and persist a new Life Coaching session record within the BuilderOS-governed loop. This includes schema definition, input validation, and database interaction for session creation.

2.  **Smallest Safe Build Slice to Close It**:
    Implement the foundational API and service layer for creating a single Life Coaching session. This slice will:
    *   Define or extend the `LifeCoachingSession` data model to include essential fields (e.g., `coachId`, `clientId`, `startTime`, `durationMinutes`, `status`).
    *   Create a `POST /builder-api/v1/life-coaching/sessions` endpoint.
    *   Implement a `createLifeCoachingSession` service method responsible for validating input and persisting the new session record to the database.
    *   Implement a corresponding controller function to handle the request, call the service, and return the appropriate response.

3.  **Exact Safe-Scope Files to Touch First**:
    *   `src/models/LifeCoachingSession.js` (Define/extend Mongoose schema or similar ORM model)
    *   `src/routes/builderLifeCoachingRoutes.js` (Add `POST /builder-api/v1/life-coaching/sessions` route)
    *   `src/controllers/builderLifeCoachingController.js` (Implement `createLifeCoachingSession` controller function)
    *   `src/services/builderLifeCoachingService.js` (Implement `createLifeCoachingSession` service method)
    *   `src/validation/lifeCoachingSessionSchema.js` (Define Joi/Yup schema for request body validation)

4.  **Verifier/Runtime Checks**:
    *   **API Call**: Send a `POST` request to `http://localhost:PORT/builder-api/v1/life-coaching/sessions` with a valid JSON payload representing a new session (e.g., `{ "coachId": "coach-g36-100", "clientId": "client-g36-100", "startTime": "2024-07-20T10:00:00Z", "durationMinutes": 60, "status": "scheduled" }`).
    *   **Expected Response**: Verify the HTTP status code is `201 Created`.
    *   **Response Body**: Verify the response body contains the newly created session object, including a unique identifier (e.g., `_id`) and the submitted data.
    *   **Database Verification**: Query the database directly to confirm the new session record exists with the correct details.

5.  **Stop Conditions if Runtime Truth Disagrees**:
    *   The API returns any `4xx` or `5xx` HTTP status code (e.g., `400 Bad Request` for invalid input, `500 Internal Server Error` for server issues).
    *   The API returns `200 OK` but the response body does not contain a valid, newly created session object or is missing critical fields.
    *   The database query does not show the created session record, or the stored data is inconsistent with the request.
    *   Schema validation errors prevent the session from being created or result in malformed data.
    *   The endpoint is not found (`404 Not Found`).