CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    email VARCHAR(255),
    password CHAR(64) -- assuming hashed passwords for security purposes 
);

CREATE TABLE IF NOT EXISTS templates (
    template_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    industry SMALLINT NOT NULL REFERENCES sectors (sector_id),
    complexity DECIMAL(10,2) CHECK (complexity IN ('simple', 'basic', 'advanced')) DEFAULT 'medium'
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id SMALLINT REFERENCES users(id),
  template_id SERIAL REFERENCES templates(template_id) ON DELETE CASCADE,
  status TEXT CHECK ((status) IN ('active', 'pending')), -- Status to track the subscription level (basic/advanced).
  payment StripeID NOT NULL REFERENCES payments(payment_id), /* Assuming a separate Payment table exists */
  startDate DATE,
  endDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 year', -- default to one-year contracts.
  FOREIGN KEY (user_id) REFERENCES users(id),
  CHECK ((endDate - startDate) > interval '-30 days') /* Ensure subscriptions are not too short */,
  PRIMARY KEY (user_id, template_id) -- Unique key as it's a many-to-many relationship.
);