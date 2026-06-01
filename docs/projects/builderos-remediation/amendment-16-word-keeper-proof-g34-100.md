## AMENDMENT 16: WORD KEEPER - Proof G34-100: Prisma Schema Definition

This document serves as a proof-closing blueprint note for the initial build slice of Amendment 16, focusing on the foundational data model definition.

---

**1. Exact Missing Implementation or Proof Gap:**

The `Word` entity's Prisma schema definition is currently absent from the `prisma/schema.prisma` file. This is the prerequisite for all subsequent data-layer and service-layer implementations.

**2. Smallest Safe Build Slice to Close It:**

Define the `Word` entity within the existing `prisma/schema.prisma` file, incorporating the specified fields and constraints from the blueprint.

**3. Exact Safe-Scope Files to Touch First:**

*   `prisma/schema.prisma`

**4. Verifier/Runtime Checks:**

*   Execute `npx prisma validate` to confirm the new schema syntax is correct and free of errors.
*   Execute `npx prisma db push --preview-feature` (or `npx prisma migrate dev` if migrations are preferred) to apply the schema changes to the development database.
*   Inspect the database directly (e.g., using a database client) to verify the `Word` table has been created with the `id`, `userId`, `text`, `language`, `createdAt`, `updatedAt` columns, and the `@@unique([userId, text, language])` constraint is active.
*   Execute `npx prisma generate` to update the Prisma client.
*   Verify that the `Word` model is now accessible and correctly typed within the generated Prisma client (e.g., `import { PrismaClient, Word } from '@prisma/client';`).

**5. Stop Conditions if Runtime Truth Disagrees:**

*   `npx prisma validate` reports any errors or warnings related to the `Word` model definition.
*   `npx prisma db push` (or `migrate dev`) fails to apply the schema changes, indicating a database connection issue, permission problem, or a conflict with existing data/schema.
*   The `Word` table or its specified columns/constraints are not found in the database after a successful `db push`/`migrate dev`.
*   `npx prisma generate` fails, preventing the update of the Prisma client.
*   The `Word` model is not found or is incorrectly typed in the generated Prisma client after `npx prisma generate`.