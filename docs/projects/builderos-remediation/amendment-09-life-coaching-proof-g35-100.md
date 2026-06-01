Blueprint Note: AMENDMENT_09_LIFE_COACHING - Proof G35-100
This note closes proof G35-100 for Amendment 09, focusing on the foundational capability to create a `CoachingSession` record.

---

1.  **Exact missing implementation or proof gap:**
    The foundational capability to persist a new `CoachingSession` record is missing. This includes the data model definition, database migration, and the service/API layer logic required to create and store `CoachingSession` instances. Without this, no coaching session data can be recorded or managed.

2.  **Smallest safe build slice to close it:**
    Implement the `CoachingSession` data model, its corresponding database migration, and a minimal internal service function to create a new `CoachingSession` record. This slice focuses solely on the persistence of the core entity.

3.  **Exact safe-scope files to touch first:**
    *   `src/data/models/CoachingSession.js` (new file: defines the schema for `CoachingSession`)
    *   `src/data/migrations/YYYYMMDDHHMMSS-create-coaching-session.js` (new file: database migration to create the `coaching_sessions` table)
    *   `src/services/coachingSessionService.js` (new file: contains `createCoachingSession` function for persistence)

4.  **Verifier/runtime checks:**
    *   **Unit Test:** Verify `CoachingSession` model instantiation and basic validation (e.g., required fields).
    *   **Migration Test:** Run the new migration and confirm the `coaching_sessions` table is created with the correct schema.
    *   **Service Integration Test:** Call `coachingSessionService.createCoachingSession` with valid data and assert that a record is successfully inserted into the database.
    *   **Database Query:** Manually query the database to confirm the presence and correctness of the created record.

5.  **Stop conditions if runtime truth disagrees:**
    *   If the `CoachingSession` model fails to validate expected data structures.
    *   If the database migration fails to execute or does not create the `coaching_sessions` table as specified.
    *   If `coachingSessionService.createCoachingSession` throws an error or fails to persist a record when provided valid input.
    *   If a subsequent database query does not retrieve the newly created `CoachingSession` record, or if the retrieved data is corrupted/incorrect.