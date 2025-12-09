```sql
CREATE TABLE translation_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  source_language VARCHAR(10),
  target_language VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cultural_context_cache (
  id SERIAL PRIMARY KEY,
  context_key VARCHAR(255) UNIQUE,
  context_data JSONB,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE voice_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  voice_data BYTEA,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE translation_models (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(255),
  model_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```