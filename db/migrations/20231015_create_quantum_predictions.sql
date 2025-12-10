```sql
CREATE TABLE IF NOT EXISTS quantum_predictions (
    id SERIAL PRIMARY KEY,
    regime_id INT REFERENCES market_regimes(id),
    prediction JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);