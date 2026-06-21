<!-- SYNOPSIS: Blueprint Proof: Command Center V2 - Core Data Model (g1095-100) -->

# Blueprint Proof: Command Center V2 - Core Data Model (g1095-100)

This document serves as a proof-closing blueprint note for the initial build slice of Command Center V2, focusing on establishing the core data model.

---

## Blueprint Note: Core Command Data Model

**1. Exact missing implementation or proof gap:**
The foundational data model for `Command` entities is not yet defined in the codebase. This includes the ORM entity definition and the corresponding database schema. Without this, no commands can be stored, tracked, or processed, blocking all subsequent phases of Command Center V2.

**2. Smallest safe build slice to close it:**
Define the `Command` ORM entity and generate/apply the initial database migration to create the `commands` table. This slice focuses solely on the persistence of command data, without implementing any business logic, API endpoints, or agent interactions.

**3. Exact safe-scope files to touch first:**
*   `src/db/entities/Command.entity.ts`: Define the `Command` ORM entity with properties such as `id` (UUID), `agentId` (string), `commandType` (string), `payload` (JSONB/text), `status` (enum: `PENDING`, `DISPATCHED`, `EXECUTING`, `COMPLETED`, `FAILED`), `createdAt` (timestamp), `updatedAt` (timestamp).
*   `src/db/migrations/<timestamp>-CreateCommandTable.ts`: (Generated via ORM tooling) Database migration to create the `commands` table based on the `Command.entity.ts` definition, ensuring correct column types, constraints, and indices.

**4. Verifier/runtime checks:**
*   **Schema Verification:** After applying the migration, connect to the database and verify the `commands` table exists with the expected columns (`id`, `