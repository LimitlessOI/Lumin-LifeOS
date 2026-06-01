# Amendment 09: Life Coaching - Proof G14-100: Coaching Session Data Model & Basic API

This document outlines the proof-closing blueprint note for establishing the foundational data model and a minimal API surface for `CoachingSession` entities within the LifeOS platform, as part of Amendment 09.

---

### Blueprint Note: Proof-Closing for Coaching Session Foundation

1.  **Exact missing implementation or proof gap:**
    The core data model for a `CoachingSession` entity is not yet defined or persisted, nor is there a basic API surface to interact with it. This gap prevents the tracking and management of individual coaching interactions.

2.  **Smallest safe build slice to close it:**
    Define the `CoachingSession` database schema (e.g., `id`, `coachId`, `clientId`, `startTime`, `endTime`, `status`, `notes`) and implement a basic set of API endpoints (`POST /api/coaching/sessions` for creation, `GET /api/coaching/sessions/:id` for retrieval) to enable foundational data persistence and access. This slice focuses on establishing the entity's persistence and a minimal interaction layer.

3.  **Exact safe-scope files to touch first:**
    *   `src/db/schema/coachingSession.js`: Define the Mongoose/Sequelize schema for `CoachingSession`.
    *   `src/db/migrations/YYYYMMDD_create_coaching_sessions_table.js`: Database migration script to create the `coaching_sessions` table.
    *   `src/api/controllers/coachingController.js`: Implement `createCoachingSession` and `getCoachingSessionById` logic.
    *   `src/api/routes/coachingRoutes.js`: Define `POST /api/coaching/sessions` and `GET /api/coaching/sessions/:id` routes, linking to the controller.
    *   `src/api/index.js`: Register `coachingRoutes`.

4.  **Verifier/runtime checks:**
    *   **Database Migration Check:** Execute `npm run db:migrate` (or equivalent) and verify that the `coaching_sessions` table is successfully created in the database with the expected columns.
    *   **API Creation Check:** Send a `POST` request to `/api/coaching/sessions` with a valid `CoachingSession` payload (e.g., `{ coachId: 'uuid1', clientId: 'uuid2', startTime: 'ISOString', endTime: 'ISOString', status: 'scheduled' }`). Expect a `201 Created` response with the newly created session object, including its `id`.
    *   **API Retrieval Check:** Using the `id` from the creation check, send a `GET` request to `/api/coaching/sessions/{id}`. Expect a `200 OK` response with the full `CoachingSession` object matching the created data.
    *   **Database Persistence Check:** Directly query the database for the created session using its `id` and confirm that all fields match the data sent via the API.

5.  **Stop conditions if runtime truth disagrees:**
    *   The database migration fails to apply or creates a table with an incorrect schema.
    *   The `POST /api/coaching/sessions` endpoint returns any status code other than `201 Created` for valid input, or the response body does not contain the expected session data.
    *   The `GET /api/coaching/sessions/{id}` endpoint returns any status code other than `200 OK` for a valid `id`, or the retrieved data does not accurately reflect the created session.
    *   Data persisted in the database for a `CoachingSession` does not match the data provided during creation.
    *   Any critical error logs appear during the execution of these checks.