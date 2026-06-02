Command Center V2 Blueprint Proof: G385-100 - Initial Database Schema
This document serves as a proof-closing blueprint note for the initial build slice of the Command Center V2 re-platforming effort, specifically addressing the foundational db schema for event ingestion.
---
Blueprint Note: Initial `command_center_events` Table Schema
1.  Exact missing implementation or proof gap:
    The explicit PgSQL schema definition for the `command_center_events` table, as outlined in Phase 1.1 Database Modernization of the Command Center V2 Blueprint. This table is critical for the Core Event Service to store ingested events.
2.  Smallest safe build slice to close it:
    Creation of a db migration script to define the `command_center_events` table with essential columns. This slice focuses solely on the schema definition, without data migration or service integration.
3.  Exact safe-scope files to touch first:
-   `db/migrations/001_create_command_center_events_table.sql` (or similar naming convention based on existing migration patterns).
4.  Verifier/runtime checks:
-   Execute the migration script against a clean PgSQL db instance.
-   Connect to the db using a SQL client (e.g., `psql`).
-   Verify the existence of the `command_center_events` table: `\d command_center_events`
-   Verify the table schema matches the expected definition:
-   `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
-   `timestamp` TIMESTAMPTZ *nn *now
-   `type` TEXT *nn
-   `source` TEXT *nn
-   `payload` JSONB
-   Attempt a basic `INSERT` operation:
                *ins command_center_events (type, source, payload)
        VALUES ('user_login', 'web_app', '{"userId": "test-user-123", "ipAddress": "192.168.1.1"}');
-   Verify the inserted record can be `SELECT`ed successfully.
5.  Stop conditions if runtime truth disagrees:
-   The `command_center_events` table does not exist after migration execution.
-   The table exists, but its column definitions (name, type, constraints) do not match the blueprint specification.
-   The `INSERT` operation fails due to schema violations (e.g., missing `*nn` constraint, type mismatch).
-   The migration script itself fails to execute or reports errors.