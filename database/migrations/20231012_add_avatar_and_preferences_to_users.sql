-- SYNOPSIS: SQL — 20231012_add_avatar_and_preferences_to_users.sql.
```sql
ALTER TABLE users
ADD COLUMN avatar_url VARCHAR(255),
ADD COLUMN preferences JSONB,
ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN updated_at SET ON UPDATE CURRENT_TIMESTAMP;
```