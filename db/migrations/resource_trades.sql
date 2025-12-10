```sql
CREATE TABLE IF NOT EXISTS resource_trades (
    id SERIAL PRIMARY KEY,
    trade_id UUID NOT NULL,
    resource_type VARCHAR(255) NOT NULL,
    quantity FLOAT NOT NULL,
    trade_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    participant_id INT NOT NULL
);
```