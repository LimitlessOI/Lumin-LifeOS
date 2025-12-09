```sql
CREATE TABLE intervention_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    intervention_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);