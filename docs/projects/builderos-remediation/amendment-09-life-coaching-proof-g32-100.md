# Amendment 09: Life Coaching - Proof G32-100

## Blueprint Note: Next Smallest Build Slice for G32-100

This document outlines the next minimal build slice required to advance the "Life Coaching" feature, specifically targeting the foundational elements of Phase 1 (G32-100: Core Service & Data Model).

---

**1. Exact Missing Implementation or Proof Gap:**

The core data model for `LifeCoachSession` and its corresponding database table definition are currently missing. These are fundamental prerequisites for implementing any session management logic within the `LifeCoachService`.

**2. Smallest Safe Build Slice to Close It:**

The smallest safe build slice involves defining the `LifeCoachSession` data model as a TypeScript interface and creating the SQL DDL for the `life_coach_sessions` table. This establishes the necessary data structure and persistence layer without requiring immediate service logic implementation.

**3. Exact Safe-Scope Files to Touch First:**

-   `src/data/models/LifeCoachSession.ts`: Define the TypeScript interface for `LifeCoachSession`.
-   `src/data/migrations/001_create_life_coach_sessions_table.sql`: Create the database migration script for the `life_coach_sessions` table.

**4. Verifier/Runtime Checks:**

-   **Database Schema Verification:**
    -   Execute the migration script.
    -   Query the database to confirm the `life_coach_sessions` table exists.
    -   Verify the table schema includes expected columns: `id` (UUID/PK), `userId` (FK to users), `startTime` (timestamp), `endTime` (timestamp, nullable), `status` (enum: 'scheduled', 'in_progress', 'completed', 'cancelled'), `notes` (text, nullable), `createdAt` (timestamp), `updatedAt` (timestamp).
-   **Type System Verification:**
    -   Ensure `src/data/models/LifeCoachSession.ts` compiles without errors.
    -   Verify that the `LifeCoachSession` interface can be imported and used correctly in other modules (e.g., a dummy test file attempting to declare a variable of type `LifeCoachSession`).

**5. Stop Conditions if Runtime Truth Disagrees:**

-   If the database migration fails to apply successfully.
-   If the `life_coach_sessions` table does not exist or its schema does not match the specification after migration.
-   If the `LifeCoachSession` TypeScript interface causes compilation errors or cannot be correctly imported/referenced by other modules.
-   If the defined columns or their types in the database table do not align with the `LifeCoachSession` interface.