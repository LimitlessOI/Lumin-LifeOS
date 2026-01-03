CREATE TABLE IF NOT EXISTS user_interactions (
  interactionId SERIAL PRIMARY KEY,
  userId UUID DEFAULT uuid_generate_v4(), -- Assuming we are using PostgreSQL with the `uuid-ossp` extension for generating unique identifiers without collisions. If not installed: replace this line accordingly or install it beforehand as per your DBMS installation instructions.
  botName VARCHAR(255) NOT NULL,
  interactionTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_interactions ON user_interactions (userId); -- Index to improve lookup performance in large datasets based on the common query pattern. Adjust index name and columns as per your actual schema design needs, if necessary.

-- Repeat for creating 'intents' table structure...