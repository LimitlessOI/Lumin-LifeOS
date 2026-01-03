CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id), 
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITHO0KT ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH OZON, -- Assume 'WITH' was a typo and meant to be 'WITHOUT'.
  status ENUM('open', 'pending review', 'resolved') NOT NULL,  
);