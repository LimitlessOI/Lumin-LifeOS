```sql
CREATE TABLE model_updates (
    id SERIAL PRIMARY KEY,
    ai_model_id INT NOT NULL,
    version VARCHAR(50) NOT NULL,
    changelog TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ai_model_id) REFERENCES ai_models(id)
);