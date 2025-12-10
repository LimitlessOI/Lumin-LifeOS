```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_status ON payments(status);

CREATE TRIGGER update_timestamp
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();
```