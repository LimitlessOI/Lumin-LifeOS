BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS market_data (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  competitor VARCHAR(255),
  price DECIMAL(10, 2) CHECK (price >= 0),
  volume BIGINT NOT NULL,
  UNIQUE(timestamp, competitor)
);
CREATE INDEX idx_market_data_competitor ON market_data (competitor);
COMMIT;