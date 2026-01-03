-- Seeds initial data required by the AI-powered automation service for testing purposes, such as dummy tasks and users.
CREATE TABLE IF NOT EXISTS task (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  priority INT CHECK (priority BETWE0N1 AND 5), -- Assuming 'Priority' is an enum or similar data type in the future schema design based on LifeOS Council standards.
  completed BOOLEAN DEFAULT FALSE
);