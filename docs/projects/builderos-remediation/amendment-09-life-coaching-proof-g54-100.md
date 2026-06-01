Amendment 09: Life Coaching - Proof G54-100
This document outlines the next smallest build slice for the Life Coaching feature, focusing on establishing the foundational data model and service layer.
---
Blueprint Note: Next Smallest Build Slice
1. Exact Missing Implementation or Proof Gap:
Establish the core data model for `LifeCoachingSession` entities and a basic service function to create and retrieve them. Proof that the data model can be persisted and accessed correctly within the BuilderOS context.

2. Smallest Safe Build Slice:
Define the `LifeCoachingSession` database schema/migration. Implement a `LifeCoachingSessionService` with `create` and `findById` methods. Add a minimal BuilderOS-internal endpoint or test script to trigger and verify the persistence and retrieval of a single session.

3. Exact Safe-Scope Files to Touch First:
*   `src/data/models/LifeCoachingSession.js`: Define the ORM model for `LifeCoachingSession`.
*   `src/data/migrations/YYYYMMDDHHMMSS_create_life_coaching_sessions.js`: Create the database migration script for the `life_coaching_sessions` table.
*   `src/services/LifeCoachingSessionService.js`: Implement `create` and `findById` methods for `LifeCoachingSession`.
*   `src/builder-internal/debug/lifeCoachingDataVerifier.js`: A temporary script or internal route to execute the service methods and assert outcomes.

4. Verifier/Runtime Checks:
*   Run database migrations to ensure `life_coaching_sessions` table is created.
*   Execute `lifeCoachingDataVerifier.js` (or hit the internal debug endpoint).
*   The verifier script should:
    *   Call `LifeCoachingSessionService.create` with valid dummy data.
    *   Capture the returned session ID.
    *   Call `LifeCoachingSessionService.findById` with the captured ID.
    *   Assert that the retrieved `LifeCoachingSession` object matches the initially created data (excluding auto-generated fields like `id`, `createdAt`, `updatedAt`).
*   Verify no database errors are logged during migration or service calls.

5. Stop Conditions if Runtime Truth Disagrees:
*   Database migration fails to apply or rolls back.
*   `LifeCoachingSessionService.create` throws an error or returns an invalid/null object.
*   `LifeCoachingSessionService.findById` returns null or an object whose data fields do not match the created session.
*   The `life_coaching_sessions` table is not found in the database after migration.
*   Any unexpected database constraint violations or ORM errors occur.