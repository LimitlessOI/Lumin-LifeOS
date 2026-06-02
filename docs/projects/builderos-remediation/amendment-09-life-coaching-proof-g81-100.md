### Proof-Closing Blueprint Note: Amendment 09 - Life Coaching (g81-100)

**1. Exact missing implementation or proof gap:**
The core data model and persistence layer for initial user coaching preferences and goal setting are not yet established. Specifically, the schema definition and basic database migrations for `UserCoachingPreferences` and `UserGoals` are missing. This includes defining the necessary fields (e.g., `userId`, `preferenceType`, `preferenceValue`, `goalName`, `goalDescription`, `targetDate`, `status`) and their relationships.

**2. Smallest safe build slice to close it:**
Implement the foundational data models and database migrations for `UserCoachingPreferences` and `UserGoals`. This slice focuses solely on schema definition, model instantiation, and ensuring the database can store these new entities. It does *not* include API endpoints, service layer logic, or UI components.

**3. Exact safe-scope files to touch first:**
*   `src/db/models/UserCoachingPreferences.js` (new file)
*   `src/db/models/UserGoals.js` (new file)
*   `src/db/migrations/YYYYMMDDHHMMSS-create-user-coaching-preferences.js` (new file, timestamped)
*   `src/db/migrations/YYYYMMDDHHMMSS-create-user-goals.js` (new file, timestamped)
*   `src/db/index.js` (to import and associate new models)

**4. Verifier/runtime checks:**
*   Execute database migrations: `npx sequelize-cli db:migrate`.
*   Verify the existence and schema of new tables (`UserCoachingPreferences`, `UserGoals`) in the database using a database client.
*   Write a temporary integration test (`test/db/model-creation.test.js`) to:
    *   Instantiate and save a dummy `UserCoachingPreferences` record.
    *   Instantiate and save a dummy `UserGoals` record.
    *   Retrieve these records by ID and verify their content matches the saved data.
    *   Verify foreign key constraints (e.g., `userId` linking to an existing `User` record) if applicable.

**5. Stop conditions if runtime truth disagrees:**
*   If `npx sequelize-cli db:migrate` fails or reports errors.
*   If the `UserCoachingPreferences` or `UserGoals` tables are not created, or their schemas are incorrect (missing columns, wrong types, incorrect constraints).
*   If the temporary integration test fails to create, save, or retrieve records without error.
*   If data integrity checks (e.g., field types, relationships, nullability) fail during testing.