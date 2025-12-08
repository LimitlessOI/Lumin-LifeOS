```sql
CREATE TABLE translations (
    id SERIAL PRIMARY KEY,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cultural_datasets (
    id SERIAL PRIMARY KEY,
    culture_name VARCHAR(100) NOT NULL,
    rules JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feedback_entries (
    id SERIAL PRIMARY KEY,
    translation_id INT REFERENCES translations(id),
    user_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE language_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);