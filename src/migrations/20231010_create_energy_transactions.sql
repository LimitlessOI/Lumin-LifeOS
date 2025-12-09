```sql
CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES energy_assets(id),
    amount DECIMAL NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);