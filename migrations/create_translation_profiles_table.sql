-- SYNOPSIS: Database migration — create_translation_profiles_table.sql.
```sql
CREATE TABLE translation_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    language_preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);