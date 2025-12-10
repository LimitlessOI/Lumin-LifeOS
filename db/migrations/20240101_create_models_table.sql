```sql
CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_models_data ON models USING gin (data);
CREATE TRIGGER update_timestamp
BEFORE UPDATE ON models
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```