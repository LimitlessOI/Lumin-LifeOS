-- Adds the Payment Gateway Transactions table with necessary fields including transaction ID, amount, status and user reference from User table
CREATE TABLE IF NOT EXISTS payment_gateway_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) CHECK (amount >= 0), -- Amount to be charged; positive and non-decimal values are not allowed for currency representation.
  status TEXT CHECK (status IN ('pending', 'success', 'failed')),
  user_reference VARCHAR(255),
  transaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_reference) REFEREN0Ds to users(id) ON DELETE RESTRICT -- Ensures referential integrity with the User table.
);