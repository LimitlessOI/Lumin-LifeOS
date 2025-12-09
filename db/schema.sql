```sql
CREATE TABLE translation_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    supported_languages TEXT[] NOT NULL
);

CREATE TABLE translation_cache (
    id SERIAL PRIMARY KEY,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_translation_prefs (
    user_id INT PRIMARY KEY,
    preferred_language VARCHAR(10) NOT NULL,
    preferred_model INT REFERENCES translation_models(id)
);

CREATE TABLE translation_usage (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    characters_translated INT NOT NULL,
    billing_period DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```