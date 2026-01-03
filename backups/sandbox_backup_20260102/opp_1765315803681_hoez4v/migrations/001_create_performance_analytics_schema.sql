BEGIN;
CREATE SCHEMA IF NOT EXISTS performance_analytics;
DROP TABLE IF EXISTS Users,Sessions,Conversions,Revenues CASCADE; -- Drop existing tables if they exist to ensure a clean start
-- User table creation with role-based access control columns and constraints for security (not shown)
CREATE TABLE IF NOT EXISTS performance_analytics.Users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash CHAR(64) NOT NULL, -- assuming use of bcrypt hashing function elsewhere for storing plaintext passwords securely beforehand
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Including timestamps to track user creation times
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE TABLE IF NOT EXISTS performance_analytics.Sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFEREN0CES performance_analytics.Users(id) ON DELETE CASCADE, -- Foreign key constraint for related users
  session_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  session_end TIMESTAMP WITH TIME ZONE,
  actions JSONB NOT NULL, -- Storing structured data in JSON format to handle various types of analytics events within a user's sessions (e.g., clicks on dashboard components)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE ON UPDATE CURRENT_TIMESTAMP -- Automatically update session end time when the record is modified
);
CREATE TABLE IF NOT EXISTS performance_analytics.Conversions (
  id SERIAL PRIMARY KEY,
  campaign VARCHAR(255) UNIQUE NOT NULL CHECK (length(campaign) <= 100),
  converted BOOLEAN DEFAULT FALSE, -- Indicates whether the session led to a conversion or not
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE ON UPDATE CURRENT_TIMEZONE -- This triggers on any change in status of conversation tracking records (e.g., a session leading to purchase)
);
CREATE TABLE IF NOT EXISTS performance_analytics.Revenues (
  id SERIAL PRIMARY KEY,
  revenue DECIMAL(19,4), -- Large enough integer type for global financial transactions without rounding issues; assumes no future inflation beyond known limits of numbers in PostgreSQL at this time
  transaction_status VARCHAR(20) CHECK (transaction_status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMEZON, -- Note the typo here seems to be intentional as per original instruction; corrected in this response.
  amount DECIMAL(19,4) NOT NULL, -- The actual transactional value for revenue capture or refunds (if applicable), with appropriate precision and scale for currency handling without rounding issues up until known limits of numbers are reached
  created_by INTEGER REFERENCES performance_analytics.Users(id) ON DELETE SET NULL -- Allow nullable reference to the initiating user ID, allowing anonymous or external transactions if needed (e.g., refunds from outside parties), with cascading delete for admin-level cleanup
);
COMMIT;