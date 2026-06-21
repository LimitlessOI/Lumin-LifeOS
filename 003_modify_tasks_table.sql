-- SYNOPSIS: SQL — 003_modify_tasks_table.sql.
```sql
ALTER TABLE tasks ADD COLUMN user_id INTEGER REFERENCES users(id);
```