```sql
CREATE TABLE translations (
    id SERIAL PRIMARY KEY,
    source_language VARCHAR(10),
    target_language VARCHAR(10),
    original_text TEXT,
    translated_text TEXT,
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_feedback (
    id SERIAL PRIMARY KEY,
    translation_id INT REFERENCES translations(id),
    user_id INT,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```