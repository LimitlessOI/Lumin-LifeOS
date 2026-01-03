CREATE TABLE IF NOT EXISTS clients (
  client_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  industry_sector VARCHAR(255),
  contact_info TEXT,
  urgency_level ENUM('low', 'moderate', 'high') DEFAULT 'low'
);