# Amendment 16 Word Keeper Proof: G11-100 - Database Schema Foundation

This document serves as the proof-closing note for build slice G11-100, focusing on the foundational database schema for the Word Keeper feature. The previous attempt failed due to incorrect file type interpretation by the verifier, as a JavaScript migration snippet was placed within a Markdown proof file.

---

### 1. Exact Missing Implementation or Proof Gap

The initial database schema definition for the `words` and `user_words` tables was incomplete and incorrectly embedded within this proof document. The gap was the complete and correctly formatted Knex migration script for these tables, and its proper placement as a migration file. Specifically, the `user_words.status` column's `defaultTo` value was truncated.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice to close this gap involves:
*   **Completing the Knex migration script:** Finalizing the `migrations/YYYYMMDDHHMMSS_create_word_user_word_tables.js` migration to correctly define the `words` and `user_words` tables, including all necessary columns, types, constraints, and default values (e.g., `user_words.status` default to `'pending'`).
*   **Executing the migration:** Ensuring the migration runs successfully in a controlled environment.
*   **Creating this proof document:** Providing a clear Markdown summary of the completed schema work and outlining the next steps.

### 3. Exact Safe-Scope Files to Touch First

*   `migrations/YYYYMMDDHHMMSS_create_word_user_word_tables.js`: To complete the database schema definition. (The `YYYYMMDDHHMMSS` placeholder will be replaced with an actual timestamp during migration generation).
*   `docs/projects/builderos-remediation/amendment-16-word-keeper-proof-g11-100.md`: This file, to contain the structured proof note.

### 4. Verifier/Runtime Checks

*   **Migration Execution:** Run `knex migrate:latest` in a development environment. Verify successful completion without errors.
*   **Schema Inspection:** Query the database to confirm the existence of `words` and `user_words` tables.
    *   Check `words` table: `id`, `text` (unique, not null), `language` (not null), `createdAt`, `updatedAt`.
    *   Check `user_words` table: `id`, `userId` (unsigned, not null), `wordId` (unsigned, not null), `status` (not null, default to 'pending').
    *   Verify foreign key constraints (if added in the completed migration).
*   **Proof Document Format:** Ensure `docs/projects/builderos-remediation/amendment-16-word-keeper-proof-g11-100.md` is valid Markdown and does not trigger syntax errors when processed by the verifier.

### 5. Stop Conditions if Runtime Truth Disagrees

*   `knex migrate:latest` command fails or reports errors.
*   Database tables (`words`, `user_words`) are not created or have incorrect schema (missing columns, wrong types, incorrect constraints/defaults).
*   The verifier continues to report syntax errors for this `.md` file, indicating incorrect formatting or embedded code.

---

**Next Build Slice:**
With the foundational database schema in place, the next smallest blueprint-backed build slice is to implement