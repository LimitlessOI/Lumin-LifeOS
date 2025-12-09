```sql
CREATE TABLE grid_optimization (
    id SERIAL PRIMARY KEY,
    strategy_name VARCHAR(255) NOT NULL,
    parameters JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);