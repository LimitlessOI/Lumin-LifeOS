-- SYNOPSIS: Database migration — create_translation_sessions_table.sql.
```sql
CREATE TABLE translation_sessions (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES translation_profiles(id),
    source_text TEXT,
    translated_text TEXT,
    source_language VARCHAR(10),
    target_language VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);