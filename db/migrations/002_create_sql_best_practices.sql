```sql
CREATE TABLE sql_best_practices (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    severity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);