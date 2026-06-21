-- SYNOPSIS: SQL — 20240102_add_transaction_indexes.sql.
CREATE INDEX idx_transactions_user_id ON Transactions(user_id);
CREATE INDEX idx_transactions_status ON Transactions(status);