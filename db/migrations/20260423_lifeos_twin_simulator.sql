-- SYNOPSIS: Database migration — 20260423_lifeos_twin_simulator.sql.
CREATE TABLE IF NOT EXISTS twin_simulator_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);