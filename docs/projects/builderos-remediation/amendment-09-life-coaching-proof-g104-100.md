# Amendment 09: Life Coaching - Proof G104-100: Initial Session Data Model & API

This document outlines the next smallest build slice to advance the Life Coaching amendment, specifically addressing the foundational data model and API for coaching sessions.

## Blueprint Note: G104-100 - Core Session Entity & API Endpoint

### 1. Exact Missing Implementation or Proof Gap

The core data model and initial API surface for managing `LifeCoachSession` entities are not yet defined or implemented. This gap prevents any further development of coaching-related features, as there is no mechanism to store or retrieve session data.

### 2. Smallest Safe Build Slice to Close It

Define the `LifeCoachSession` schema, implement a database migration to create the corresponding table, and expose a basic RESTful API endpoint (`/api/v1/life-coaching/sessions`) for creating and retrieving these sessions. This slice focuses solely on the persistence and basic access layer for the core entity.

### 3. Exact Safe-Scope Files to Touch First

*   `src/models/LifeCoachSession.js`: Define the Mongoose/Sequelize schema for `LifeCoachSession`.
*   `src/db/migrations/YYYYMMDDHHMMSS_create_life_coach_sessions_table.js`: Database migration script to create the `life_coach_sessions` table with essential fields (e.g., `coachId`, `clientId`, `startTime`, `endTime`, `status`, `notes`).
*   `src/services/lifeCoachingService.js`: Implement basic CRUD operations for `LifeCoachSession` (e.g., `createSession`, `getSessions`, `getSessionById`).
*   `src/routes/lifeCoachingRoutes.js`: Define API routes for `/api/v1/life-coaching/sessions` (POST for creation, GET for listing/retrieval by ID).
*   `src/app.js` (or `src/server.js`): Integrate `lifeCoachingRoutes` into the main application router.

### 4. Verifier/Runtime Checks

*   **Database Migration:**
    *   Run `npm run db:migrate`. Verify that the `life_coach_sessions` table is created in the database with the expected columns and indices.
*   **API Endpoint Availability:**
    *   `GET /api/v1/life-coaching/sessions`: Expect a 200 OK response, initially returning an empty array `[]`.
*   **Session Creation:**
    *   `POST /api/v1/life-coaching/sessions` with a valid payload (e.g., `{ "coachId": "uuid-coach-1", "clientId": "uuid-client-1", "startTime": "2023-10-27T10:00:00Z", "endTime": "2023-10-27T11:00:00Z", "status": "scheduled" }`).
    *   Expect a 201 Created response with the newly created session object, including a generated `_id` (or `id`).
*   **Session Retrieval:**
    *   After creation, `GET /api/v1/life-coaching/sessions` should return an array containing the created session.
    *   `GET /api/v1/life-coaching/sessions/:id` (using the `_id` from creation) should return a 200 OK response with the specific session object.

### 5. Stop Conditions if Runtime Truth Disagrees

*   Database migration fails to execute or results in an incorrect table schema.
*   API endpoints return 4xx/5xx errors for valid requests.
*   Data persisted via POST requests cannot be retrieved correctly via GET requests.
*   The application fails to start or crashes due to issues in the new routes, models, or services.