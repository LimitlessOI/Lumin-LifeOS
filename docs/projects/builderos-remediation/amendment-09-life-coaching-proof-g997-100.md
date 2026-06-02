Amendment 09: Life Coaching - Proof G997-100
This document outlines the next smallest blueprint-backed build slice for the Life Coaching feature, focusing on establishing the foundational data model and basic API for Coaching Sessions.
---
Proof-Closing Blueprint Note
1. Exact Missing Implementation or Proof Gap:
The core gap is the absence of a defined `CoachingSession` data model (schema) and the corresponding minimal API endpoints for creation and retrieval. Specifically:
    *   `CoachingSession` schema definition (e.g., `coachId`, `clientId`, `startTime`, `endTime`, `status`).
    *   Service layer functions to create and retrieve `CoachingSession` instances.
    *   API routes for `POST /coaching-sessions` and `GET /coaching-sessions/:id`.

2. Smallest Safe Build Slice to Close It:
This slice focuses on establishing the foundational data persistence and access for `CoachingSession` without impacting existing user features or TSOS surfaces.
    *   Define the `CoachingSession` data model/schema.
    *   Implement `createCoachingSession` and `getCoachingSessionById` functions in a new service file.
    *   Add new API routes for `POST /coaching-sessions` (to create) and `GET /coaching-sessions/:id` (to retrieve) that utilize the new service functions.

3. Exact Safe-Scope Files to Touch First:
    *   `src/models/CoachingSession.js` (new file for schema definition)
    *   `src/services/coachingSessionService.js` (new file for business logic)
    *   `src/routes/coachingSessions.js` (new file for API routes)
    *   `src/app.js` or `src/index.js` (to import and register `coachingSessions.js` routes)

4. Verifier/Runtime Checks:
    *   **Unit Tests:** Verify `CoachingSession` model validation rules. Verify `createCoachingSession` and `getCoachingSessionById` service functions handle valid/invalid inputs and interact correctly with the data layer (mocked).
    *   **Integration Tests:**
        *   `POST /coaching-sessions` with valid payload returns `201 Created` and the created session data.
        *   `GET /coaching-sessions/:id` with a valid ID returns `200 OK` and the correct session data.
        *   `GET /coaching-sessions/:id` with a non-existent ID returns `404 Not Found`.
    *   **Database Schema Check:** Confirm the `CoachingSession` collection/table is created with the expected fields.

5. Stop Conditions if Runtime Truth Disagrees:
    *   API endpoints return `5xx` errors for valid requests.
    *   Data integrity issues (e.g., `CoachingSession` data saved incorrectly or partially).
    *   Schema validation errors prevent data operations.
    *   Integration tests fail to create or retrieve sessions as expected.
    *   Significant performance degradation observed for these new endpoints.