-- SYNOPSIS: Database migration — 20260724_lifeos_core_stable.sql.
To address the stability of LifeOS Core and ensure proper migration, follow these steps:

1. **Review Current Migrations**: 
   - Examine any existing SQL migration scripts to ensure they reflect all required changes for stability. Look for any missed updates or inconsistencies.

2. **Prepare Migration Script**:
   - Open or create the file `db/migrations/20260724_lifeos_core_stable.sql`.
   - Add the necessary SQL statements. Make sure to include:
     - `CREATE TABLE IF NOT EXISTS` statements for any new tables.
     - Constraints or checks such as `CHECK (stable IS TRUE)` where applicable.
   - Ensure SQL statements are idempotent to prevent issues if run multiple times.

3. **Run Migrations**:
   - Execute the migration script on your database environment. Confirm that all changes are applied without errors.

4. **Perform Stability Checks**:
   - Verify schema correctness and ensure all expected tables and indexes exist.
   - Check data integrity by reviewing constraints and relationships.
   - Run unit or integration tests associated with database functionality to ensure everything operates correctly.

5. **Monitor Performance**:
   - After migration, monitor for any slow queries or performance issues.
   - Optimize queries or indexes as needed to maintain efficient performance.

6. **Documentation**:
   - Document any changes or adjustments made during the migration process. This will be crucial for future maintenance and troubleshooting.

By ensuring these steps, you can maintain a stable and functional LifeOS Core.