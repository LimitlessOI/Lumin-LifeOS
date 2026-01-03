-- Assuming the schema is already created, here's how you might set up a simplified version of it. Adjust field types and constraints based on detailed business requirements.
CREATE TABLE IF NOT EXISTS customers (
  customer_id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  -- Additional fields like phone number or address could be added here if needed...
);