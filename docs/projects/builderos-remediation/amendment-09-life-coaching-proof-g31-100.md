# Proof-Closing Blueprint Note: Amendment 09 - Life Coaching (G31-100)

This document outlines the next smallest build slice for Amendment 09, focusing on establishing the foundational data model for Life Coaching sessions.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of a defined and persistent data model for `LifeCoachSession` entities within the LifeOS platform. This includes the database schema definition and the initial service layer functionality to manage these sessions. Without this, no coaching-related interactions can be recorded or managed.

## 2. Smallest Safe Build Slice to Close It

Define the `LifeCoachSession` database schema and implement a minimal service layer function to create a new `LifeCoachSession` record. This slice focuses solely on data persistence and basic creation, avoiding complex business logic or user-facing UI changes.

## 3. Exact Safe-Scope Files to Touch First

*   `src/db/schema/lifeCoachSession.js`: Define the Mongoose schema for `LifeCoachSession`.
*   `src/services/lifeCoachService.js`: Add a `createLifeCoachSession` function.
*   `src/routes/v1/lifeCoachRoutes.js`: Add a `POST /api/v1/life-coach/sessions` endpoint to expose the creation functionality.
*   `src/db/migrations/YYYYMMDDHHMMSS-create-life-coach-sessions-table.js`: Database migration script to create the `lifeCoachSessions` collection/table.

## 4. Verifier/Runtime Checks

1.  **Database Migration Success:** Verify that the new migration runs without errors, creating the `lifeCoachSessions` collection/table in the database.
    *   `npm run db:migrate`
    *   Check database for `lifeCoachSessions` collection.
2.  **API Endpoint Functionality:** Send a `POST` request to `/api/v1/life-coach/sessions` with a valid session payload.
    *   Expected: HTTP 201 Created response with the newly created session object.
    *   Expected: The session data is correctly persisted in the `lifeCoachSessions` collection.
3.  **Data Integrity:** Retrieve the created session (e.g., via a direct database query or a temporary GET endpoint) and confirm that all provided fields are stored accurately and without corruption.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Migration Failure:** If the database migration fails to create the `lifeCoachSessions` collection/table, stop and investigate schema definition or migration script errors.
*   **API Creation Failure:** If the `POST /api/v1/life-coach/sessions` endpoint returns any HTTP 4xx or 5xx error, or if the response body indicates a failure to create the session, stop and debug the service layer or route handler.
*   **Data Mismatch:** If the data retrieved from the database for a newly created session does not match the data sent in the creation request, stop and investigate schema mapping or persistence logic.