```sql
ALTER TABLE projects
ADD CONSTRAINT fk_client
FOREIGN KEY (client_id) REFERENCES clients(id)
ON DELETE SET NULL;
```