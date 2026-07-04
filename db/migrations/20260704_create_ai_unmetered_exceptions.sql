-- SYNOPSIS: Database migration — 20260704_create_ai_unmetered_exceptions.sql.
-- Create table for tracking unmetered AI usage exceptions.
CREATE TABLE IF NOT EXISTS ai_unmetered_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Ensure the primary key is indexed via the table constraint; no extra indexes required for the exact contract.