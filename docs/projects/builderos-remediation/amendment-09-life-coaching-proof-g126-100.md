<!-- SYNOPSIS: Documentation — Amendment 09 Life Coaching Proof G126 100. -->

The source blueprint `docs/projects/AMENDMENT_09_LIFE_COACHING.md` was not provided, requiring assumptions about its content and the specific nature of proof `g126-100`.
---
Amendment 09 Life Coaching - Proof G126-100 Remediation

This document outlines the remediation plan for proof gap `g126-100` identified in the context of `AMENDMENT_09_LIFE_COACHING.md`. The goal is to establish a foundational, verifiable mechanism for managing life coaching session records within LifeOS.

### 1. Exact Missing Implementation or Proof Gap

The current gap `g126-100` signifies the absence of a robust, verifiable implementation for persisting and retrieving core life coaching session metadata. This foundational capability is critical for all subsequent features outlined in Amendment 09 that rely on tracking and managing individual coaching sessions. Without this, the system cannot reliably record the existence, status, or participants of a coaching session.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves implementing the core data model and service layer functions necessary to create and retrieve a basic life coaching session record. This slice focuses exclusively on internal data persistence and retrieval logic, without exposing it via external APIs or user interfaces, ensuring minimal impact and maximum testability.

**Scope:**
-   Define a data model for `LifeCoachingSession` with essential attributes: `id` (UUID), `coachId` (UUID), `clientId` (UUID), `startTime` (ISO timestamp), `endTime` (ISO timestamp), `status` (e.g., 'scheduled', 'completed', 'cancelled'), `notes` (text, optional), `createdAt` (timestamp), `updatedAt` (timestamp).
-   Implement service methods to:
    -   `createLifeCoachingSession(sessionData)`: Persists a new session record.
    -   `getLifeCoachingSessionById(sessionId)`: Retrieves a session record by its ID.
    -   `getLifeCoachingSessionsByClientId(clientId)`: Retrieves all sessions for a given client.
-   This slice explicitly *excludes* any API route definitions, controller logic, or user interface components.

### 3. Exact Safe-Scope Files to Touch First

The following files represent the initial, safe-scope touch points for this build slice:

-   `src/db/migrations/YYYYMMDDHHMMSS_create_life_coaching_sessions.js`: Database migration to create the `life_coaching_sessions` table.
-   `src/models/LifeCoachingSession.js`: ORM model definition for the `LifeCoachingSession` entity.
-   `src/services/lifeCoachingSessionService.js`: Service layer module containing `createLifeCoachingSession`, `getLifeCoachingSessionById`, and `getLifeCoachingSessionsByClientId` functions.
-   `src/services/__tests__/lifeCoachingSessionService.test.js`: Unit and integration tests for the `lifeCoachingSessionService`.

### 4. Verifier/Runtime Checks

To verify the successful implementation and closure of this proof gap:

-   **Database Schema Check:** After migration, query the database to confirm the `life_coaching_sessions` table exists with all specified columns (`id`, `coachId`, `clientId`, `startTime`, `endTime`, `status`, `notes`, `createdAt`, `updatedAt`) and appropriate data types/constraints (e.g., UUIDs for IDs, timestamps for dates, foreign key constraints on `coachId` and `clientId`).
-   **Unit Test Execution:** All tests within `src/services/__tests__/lifeCoachingSessionService.test.js` must pass, covering:
    -   Successful creation of a new session.
    -   Successful retrieval of an existing session by ID.
    -   Successful retrieval of sessions by client ID.
    -   Handling of invalid input data (e.g., missing required fields).
    -   Handling of attempts to retrieve non-existent sessions.
-   **Integration Test Execution:** Ensure the service layer correctly interacts with the actual database (or a test database instance) for persistence and retrieval operations.

### 5. Stop Conditions if Runtime Truth Disagrees

The build pass should halt and require re-evaluation under the following conditions:

-   **Migration Failure:** The database migration `YYYYMMDDHHMMSS_create_life_coaching_sessions.js` fails to execute successfully, or the resulting table schema does not match the specification.
-   **Test Failures:** Any unit or integration test within `src/services/__tests__/lifeCoachingSessionService.test.js` fails, indicating a functional defect in the service layer or data model.
-   **Data Inconsistency:** Attempts to create or retrieve session