Proof-Closing Blueprint Note: AMENDMENT_01_AI_COUNCIL - g92-100
This document serves as a proof-closing blueprint note for the `g92-100` build slice, derived from the `AMENDMENT_01_AI_COUNCIL.md` blueprint. It outlines the smallest safe build slice to establish the foundational data model for the AI Council within the LifeOS platform.
---
1. Exact Missing Implementation or Proof Gap
The exact missing implementation is the foundational data model definition for the `AICouncil` entity. This includes its core identifier and name, enabling its basic representation and persistence within the system.
2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves defining the TS type for `AICouncil` and creating the corresponding db schema migration to establish the `ai_council` table. This provides the necessary structural foundation without introducing any business logic or apiEPs.
3. Exact Safe-Scope Files to Touch First
-   `src/types/AICouncil.d.ts`
-   `src/db/migrations/YYYYMMDDHHMMSS_create_ai_council_table.ts` (where `YYYYMMDDHHMMSS` is a timestamp)
4. Verifier/Runtime Checks
-   Database Schema Check: After running migrations, verify the existence of the `ai_council` table in the db.
-   SQL: `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_council');`
-   SQL: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_council' AND column_name IN ('id', 'name', 'created_at', 'updated_at');`
-   TS Compilation Check: Ensure the project compiles without errors, confirming `src/types/AICouncil.d.ts` is correctly integrated and recognized by the TS compiler.
-   Command: `tsc --noEmit`
5. Stop Conditions if Runtime Truth Disagrees
-   If the `ai_council` table does not exist in the db after migration.
-   If the `ai_council` table exists but lacks the `id` (primary key), `name` (string), `created_at` (timestamp), or `updated_at` (timestamp) columns with appropriate types.
-   If TS compilation fails due to issues related to the `AICouncil` type definition.