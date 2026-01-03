BEGIN;
-- Setup initial database schema for Make.com scenarios, users, executions, and financials tables with all required fields as described in the plan.
CREATE TABLE IF NOT EXISTS user(user_id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS scenario (scenario_name VARCHAR(255) NOT NULL, description TEXT, steps JSONB[], owner INTEGER REFERENCES user(user_id));
CREATE TABLE IF NOT EXISTS executions(execution_id SERIAL PRIMARY KEY, start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, end_time TIMESTAMP WITH TIME ZONE, status VARCHAR(50), foreign key (owner) REFERENS