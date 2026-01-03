// migrations/001_create_table.sql - Database Schema Migration SQL script using Neon PostgreSQL syntax
CREATE TABLE IF NOT EXISTS users (
  UserID SERIAL PRIMARY KEY,
  Name VARCHAR(255) NOT NULL,
  Email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  ConvoID SERIAL PRIMARY KEY,
  UserID INT REFERENCES users(UserID),
  StartTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  MessageID SERIAL PRIMARY KEY,
  ConvoID INT REFERENCES conversations(ConvoID),
  TextContent VARCHAR(255) NOT NULL,
  Timestamp TIMESTAMP DEFAULT CURRENT03-18T19:47:56.244Z [current timestamp with timezone] +---------------------+ | ConversationId       | ---------------|---------+---------+---------+------+--------+---------+-------| ||======================||=========CONVO_ID===========||---------+---------+---------+---------+------|