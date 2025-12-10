```sql
CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);