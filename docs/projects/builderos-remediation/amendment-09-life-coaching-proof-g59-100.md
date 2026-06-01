# Amendment 09: Life Coaching - Proof G59-100

This document outlines the next smallest build slice for the Life Coaching feature, following the blueprint `AMENDMENT_09_LIFE_COACHING.md`. This proof-closing note focuses on establishing the foundational data model for coaching sessions.

---

### Blueprint Note: LifeCoachSession Data Model & Migration

**1. Exact missing implementation or proof gap:**
The core data model for `LifeCoachSession` is not yet defined or persisted in the database. This gap prevents the tracking and management of individual coaching sessions, which is a fundamental requirement for the Life Coaching feature.

**2. Smallest safe build slice to close it:**
Define the `LifeCoachSession` data model, including its schema, and create the corresponding database migration to establish the `life_coach_sessions` table. This slice focuses solely on the foundational data structure, ensuring the database is ready to store session-related information.

**3. Exact safe-scope files to touch first:**
*   `src/models/LifeCoachSession.js` (for the model definition, assuming an ORM/ODM or custom data access layer)
*   `src/db/migrations/YYYYMMDDHHMMSS_create_life_coach_sessions_table.js` (for the database schema migration, where `YYYYMMDDHHMMSS` is a timestamp)

**4. Verifier/runtime checks:**
*   Execute database migrations: `npm run db:migrate` (or equivalent command for the specific ORM/migration tool).
*   Verify that the `life_coach_sessions` table is successfully created in the database with the expected columns (e.g., `id`, `coachId`, `clientId`, `startTime`, `endTime`, `status`, `notes`, `createdAt`, `updatedAt`) and appropriate data types and constraints.
*   Programmatically attempt to instantiate the `LifeCoachSession` model and confirm its schema definition aligns with the database table (e.g., via ORM introspection or by attempting to create a dummy record in a test environment).
*   (Manual/Test) Connect to the database directly and inspect the `life_coach_sessions` table structure.

**5. Stop conditions if runtime truth disagrees:**
*   The database migration fails to execute, rolls back, or reports errors.
*   The `life_coach_sessions` table is not created, or its schema significantly deviates from the blueprint's requirements (e.g., critical columns are missing, data types are incorrect, or essential indices/