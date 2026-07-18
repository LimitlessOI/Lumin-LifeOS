-- SYNOPSIS: Database migration — 202311_memory_taxonomy_update.sql.
The database migration script provided updates two tables, `conversation_memory` and `memory_capsules`, by adding a `memory_category` column to each. This column is constrained to specific values ('user_preference', 'decision', 'context', 'fact') and indexed to improve query performance.

Here's a concise breakdown of the script's functionality:

1. **Add Column**: 
   - Adds a `memory_category` column to both `conversation_memory` and `memory_capsules` tables if it doesn't already exist.

2. **Add Constraint**: 
   - Ensures the `memory_category` column only accepts predefined values by adding a check constraint if it doesn't already exist.

3. **Create Index**: 
   - Creates an index on the `memory_category` column in both tables if it doesn't already exist, to improve the efficiency of filtering operations.

This script is structured to avoid errors if the operations have already been applied, thus making it idempotent and safe for repeated executions. If this aligns with your requirements, it should effectively reflect the memory category taxonomy in your schema.