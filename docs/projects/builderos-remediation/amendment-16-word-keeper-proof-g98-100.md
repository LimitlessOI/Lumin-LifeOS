# Amendment 16: Word Keeper - Proof G98-100: Initial KeptWord Data Model and Persistence

This document outlines the next smallest build slice for Amendment 16, focusing on the foundational data model and persistence layer for "Kept Words."

---

### Blueprint Note: Proof-Closing Build Slice

**1. Exact missing implementation or proof gap:**
The core data model for `KeptWord` entities is not yet defined or persisted. Specifically, the database schema for storing a `KeptWord` (including `word_text`, `user_id`, `context_id`, `created_at`, `updated_at`) and the initial database migration to create the corresponding `kept_words` table are missing. This gap prevents any further development of features that rely on storing and retrieving kept words.

**2. Smallest safe build slice to close it:**
Implement the `KeptWord` data model definition (e.g., using a Mongoose schema or Sequelize model, depending on existing patterns) and create the initial database migration script to establish the `kept_words` table. This slice focuses solely on schema definition and table creation, without introducing any API endpoints, business logic, or service layer interactions.

**3. Exact safe-scope files to touch first:**
*   `src/models/KeptWord.js` (Define the Mongoose/Sequelize model for `KeptWord`)
*   `src/db/migrations/YYYYMMDDHHMMSS_create_kept_words_table.js` (Create the database migration script for the `kept_words` table)
*   `src/db/index.js` (If necessary, register the new `KeptWord` model with the database connection)

**4. Verifier/runtime checks:**
*   Execute database migrations: `npm run db:migrate` (or equivalent command for the project's ORM/migration tool).
*   Connect to the development database using a database client (e.g., `psql`, MongoDB Compass) and verify that the `kept_words` collection/table exists.
*   Confirm the `kept_words` collection/table contains the expected fields: `_id` (or `id`), `word_text` (string), `user_id` (string/ObjectId), `context_id` (string/ObjectId, nullable), `createdAt` (Date), `updatedAt` (Date).
*   Attempt to insert a dummy `KeptWord` record directly into the database via a database client and verify successful insertion and retrieval of the record with correct data types.

**5. Stop conditions if runtime truth disagrees:**
*   The database migration fails to execute successfully, reporting errors.
*   The `kept_words` collection/table does not exist in the database after the migration completes.
*   The `kept_words` collection/table exists but is missing any of the specified fields (`word_text`, `user_id`, `context_id`, `createdAt`, `updatedAt`) or has incorrect data types for these fields.
*   Direct database insertion of a dummy `KeptWord` record fails or results in data corruption/unexpected schema validation errors.