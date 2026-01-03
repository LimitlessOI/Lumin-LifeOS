CREATE TABLE IF NOT EXISTS InteractionLogs (
  InteractionID SERIAL PRIMARY KEY,
  Timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT0ENTTIMEZON(),
  UserID VARCHAR(255) REFERENCES CustomerData(CustomerID),
  BotResponse TEXT NOT NULL,
  SentimentScore FLOAT CHECK (SentimentScore >= -1.0 AND SentimentScore <= 1.0) -- Example constraint for sentiment scores typically between these two values
);