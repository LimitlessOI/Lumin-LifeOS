```sql
CREATE TABLE federated_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) UNIQUE NOT NULL,
    model_data BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);