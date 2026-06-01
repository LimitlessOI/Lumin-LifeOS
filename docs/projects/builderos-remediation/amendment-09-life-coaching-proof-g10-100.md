Amendment 09: Life Coaching - Proof G10-100
This document outlines the first build slice for the Life Coaching feature, focusing on establishing the foundational data model and the initial session creation mechanism.
---
Proof-Closing Blueprint Note
1.  **Exact Missing Implementation or Proof Gap:**
    The core gap is the absence of the `CoachingSession` data model definition and its associated persistence layer. This includes:
    *   `CoachingSession` schema definition (e.g., `id`, `coachId`, `clientId`, `startTime`, `endTime`, `status`, `notes`).
    *   Basic data access object (DAO) or repository for `CoachingSession` to handle creation and retrieval.

2.  **Smallest Safe Build Slice to Close It:**
    Define the `CoachingSession` data model schema and implement a minimal `CoachingSessionRepository` with `create` and `findById` methods. This establishes the core data structure and its persistence interface without exposing it to user-facing APIs yet.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `src/models/CoachingSession.js` (for the ORM model definition, e.g., Mongoose schema, Sequelize model, or plain JS object with validation).
    *   `src/repositories/CoachingSessionRepository.js` (for data access logic, encapsulating database interactions for `CoachingSession`).

4.  **Verifier/Runtime Checks:**
    *   **Unit Test:** Write a test suite for `CoachingSessionRepository` that:
        *   Successfully creates a new `CoachingSession` record in the database.
        *   Successfully retrieves an existing `CoachingSession` record by its ID.
        *   Verifies that the created and retrieved session data adheres to the defined `CoachingSession` schema (e.g., required fields, data types).
    *   **Schema Validation:** If using a separate schema validation library, ensure the `CoachingSession` schema definition itself passes internal validation checks.
    *   **Database Connection:** Verify that the application can establish and maintain a connection to the underlying database system required for `CoachingSession` persistence.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   `CoachingSession` model definition causes schema validation errors or database migration failures.
    *   Database connection fails or becomes unstable when attempting `CoachingSession` operations.
    *   `CoachingSessionRepository.create` fails to persist a session, returns an error, or persists malformed data.
    *   `CoachingSessionRepository.findById` fails to retrieve a previously created session, returns an error, or retrieves incorrect/incomplete data.
    *   Any unexpected runtime errors or exceptions during the definition, instantiation, or interaction with `CoachingSession` model or repository.