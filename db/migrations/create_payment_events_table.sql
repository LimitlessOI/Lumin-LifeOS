CREATE TABLE payment_events (
  event_id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);