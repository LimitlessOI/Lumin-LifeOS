### AMENDMENT_09_LIFE_COACHING - Proof G25-100: Initial Coaching Session Creation

This proof point addresses the foundational capability to create a new coaching session within the LifeOS platform, establishing the core data model and API surface for this feature.

**1. Exact Missing Implementation or Proof Gap:**
The core data model for `CoachingSession` and the corresponding API endpoint for its creation are not yet defined or implemented. This includes the database schema, repository methods for persistence, and the API route to expose this functionality.

**2. Smallest Safe Build Slice to Close It:**
Define the `CoachingSession` database schema and implement a basic `POST /api/v1/coaching-sessions` API endpoint. This endpoint will allow for the creation of new coaching session records, including validation and persistence.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/db/schema/coachingSession.js`: Define the Mongoose/Sequelize schema for `CoachingSession` (e.g., `coachId`, `clientId`, `scheduledTime`, `durationMinutes`, `status`).
*   `src/db/repositories/coachingSessionRepository.js`: Implement `createCoachingSession` method to interact with the database.
*   `src/api/routes/coachingSessions.js`: Define the `POST /` route handler for creating a session, including input validation and calling the repository.
*   `src/api/index.js`: Register the `coachingSessions` router under `/api/v1/coaching-sessions`.

**4. Verifier/Runtime Checks:**
*   **API Test:** Send a `POST` request to `/api/v1/coaching