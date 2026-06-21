<!-- SYNOPSIS: Proof-Closing Blueprint Note: G1007 - Define Prisma schema for SystemHealthMetric -->

# Proof-Closing Blueprint Note: G1007 - Define Prisma schema for SystemHealthMetric

## 1. Exact Missing Implementation or Proof Gap
The `SystemHealthMetric` data model needs to be defined within the BuilderOS Prisma schema. This is the foundational step for persisting system health data as outlined in Amendment 12.

## 2. Smallest Safe Build Slice to Close It
Define the `SystemHealthMetric` model in `prisma/schema.prisma` with the specified fields and types. This slice is self-contained and only modifies the database schema definition.

## 3. Exact Safe-Scope Files to Touch First
-   `prisma/schema.prisma`

## 4. Verifier/Runtime Checks
1.  Execute `npx prisma db push` (or `npx prisma migrate dev` if migrations are preferred for this environment) to apply the schema changes to the database.
2.  Verify that a new table named `SystemHealthMetric` (or similar, depending on Prisma's naming conventions) has been created in the BuilderOS database.
3.  Confirm the table contains the columns: `id`, `component`, `metricName`, `value`, `timestamp` with appropriate data types (e.g., `String`, `String`, `String`, `Float`, `DateTime`).
4.  Run `npx prisma generate` to update the Prisma client.
5.  Verify that the `SystemHealthMetric` model is available in the generated Prisma client (e.g., by attempting to import `PrismaClient` and checking for `prisma.systemHealthMetric`).

## 5. Stop Conditions if Runtime Truth Disagrees
-   `npx prisma db push` (or `migrate dev`) fails to execute successfully.
-   The `SystemHealthMetric` table is not created in the database, or its schema (columns, types) does not match the definition.
-   `npx prisma generate` fails, or the `SystemHealthMetric` model is not present in the generated Prisma client.