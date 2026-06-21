-- SYNOPSIS: SQL — 20240102_add_transaction_foreign_key.sql.
```sql
ALTER TABLE transactions
ADD CONSTRAINT fk_payment
FOREIGN KEY (payment_id) REFERENCES payments(id)
ON DELETE CASCADE;
```