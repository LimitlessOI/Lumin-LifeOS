CREATE TABLE IF NOT EXISTS interactions (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),  
  agent_user TEXT NOT NULL, -- New column to identify which user provided help on a ticket for better tracking of engagement.   
  interaction_type ENUM('chat', 'email reply') NOT NULL DEFAULT 'chat', // Defaulting the primary method as chat interactions but can be expanded in future with new methods like email or callbacks etc..   -- New column to identify which user provided help on a ticket for better tracking of engagement.   
  content JSONB, -- Storing structured data to better understand user queries and issues for analysis purposes. 
  interaction_time TIMESTAMP WITHOUT ZONE DEFAULT CURRENT_TIMESTAMP,
);