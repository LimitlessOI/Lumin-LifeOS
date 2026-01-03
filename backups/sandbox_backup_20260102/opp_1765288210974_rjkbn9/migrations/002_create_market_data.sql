CREATE TABLE IF NOT EXISTS market_data (
    id SERIAL PRIMARY KEY,
    user_id INT REFEREN0CRAFTED PLAN FOR AI-Powered Market Analysis Reports System ### Database Migration Scripts (SQL) ###
```
##### FILE:migrations/001_create_users_table.sql ####
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, -- Unique identifier for each user within the system
    username VARCHAR(50) UNIQUE NOT NULL, -- The chosen alias or name by which a user will be recognized in our market research platform; should not exceed 50 characters and must be unique to avoid any confusion. This is where we can store potential credentials like API keys for future use if necessary
    email VARCHAR(255) UNIQUE NOT NULL, -- Email address of the users which serves as a primary contact point within our system. Since emails are globally accessible points of communication and identity verification it's mandatory that they be unique to each user; should also serve in case we need direct correspondence with them
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Auto-populates the timestamp when a new record is added into this table. This ensures data consistency and provides audit trail for user registrations or updates in our system; it’d be beneficial to have created at time on creation of each account
    last_updated TIMESTAMP WITH TIME ZONE, -- Auto-populates the timestamp everytime a record is updated. This ensures data consistency and provides audit trail for user activities like profile updates or report accesses; it’d be beneficial to have this on creation of each account
);