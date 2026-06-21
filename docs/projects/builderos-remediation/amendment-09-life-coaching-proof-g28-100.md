<!-- SYNOPSIS: Amendment 09: Life Coaching - Proof G28-100: Initial CoachingSession Data Model -->

# Amendment 09: Life Coaching - Proof G28-100: Initial CoachingSession Data Model

This proof-closing blueprint note addresses the foundational data model for `CoachingSession` within the LifeOS platform, as derived from `AMENDMENT_09_LIFE_COACHING.md`. This is the smallest safe build slice to establish the core persistence layer for life coaching interactions.

---

### 1. Exact Missing Implementation or Proof Gap

The initial data model definition, schema, and basic persistence layer for a `CoachingSession` entity are missing. This includes the database table creation and a minimal set of CRUD operations to manage coaching session records.

### 2. Smallest Safe Build Slice to Close It

Define the `CoachingSession` data model schema, implement a database migration to create the corresponding table, and establish a basic repository and service layer for `CoachingSession` creation and retrieval. This slice focuses solely on data persistence and access, without exposing any API endpoints or UI components.

### 3. Exact Safe-Scope Files to Touch First

*   `src/data/models/CoachingSession.js`: Define the Mongoose/Sequelize schema for `CoachingSession`.
    *   **Schema fields (example):** `userId` (UUID, ref to User), `coachId` (UUID, ref to User), `scheduledAt` (Date), `durationMinutes` (Number), `status` (String: 'scheduled', 'completed', 'cancelled'), `notes` (String), `createdAt` (Date), `updatedAt` (Date).
*   `src/data/migrations/YYYYMMDDHHMMSS-create-coaching-session.js`: Database migration script to create the `coaching_sessions` table with appropriate indices.
*   `src/data/repositories/CoachingSessionRepository.js`: Implement basic CRUD methods (`create`, `findById`, `findByUserId`, `updateStatus`).
*   `src/data/services/CoachingSessionService.js`: Provide a thin service layer wrapping the repository for business logic separation (e.g., `createSession`, `getSessionById`).
*   `src/data/index.js`: Register the new `CoachingSession` model and repository for global access within the data layer.

### 4. Verifier/Runtime Checks

1.  **Migration Success:** Execute database migrations; verify `coaching_sessions` table is created successfully in the database.
2.  **Model Instantiation:** Programmatically instantiate a `CoachingSession` model instance and verify its structure.
3.  **Create Operation:** Call `CoachingSessionService.createSession()` with valid data; verify a new record appears in the `coaching_sessions` table.
4.  **Retrieve Operation:** Call `CoachingSessionService.getSessionById()` using the ID of the created session; verify the correct data is returned.
5.  **Data Integrity:** Attempt to create a session with invalid data (e.g., missing required fields); verify appropriate validation errors are thrown.
6.  **No Regression:** Run existing data layer unit/integration tests to ensure no existing LifeOS data models or services are negatively impacted.

### 5. Stop Conditions if Runtime Truth Disagrees

*   The database migration fails to execute or rolls back unexpectedly.
*   `CoachingSession` records cannot be successfully created or retrieved from the database.
*   Data validation rules defined in the model do not function as expected.
*   Existing LifeOS data models or services exhibit unexpected errors, data corruption, or performance degradation after the migration or service integration.
*   The `coaching_sessions` table schema does not match the blueprint specification.