-- SYNOPSIS: SQL — 20240101000001_add_projects_foreign_key.sql.
```sql
ALTER TABLE projects
ADD CONSTRAINT fk_client
FOREIGN KEY (client_id) REFERENCES clients(id)
ON DELETE SET NULL;
```